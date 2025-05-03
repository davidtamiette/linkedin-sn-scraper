/**
 * LinkedIn Sales Navigator Scraper
 * 
 * Ator Apify para extração de dados do LinkedIn Sales Navigator
 * com foco em alta performance e baixo consumo de recursos.
 * 
 * Autor: [Seu Nome]
 * Versão: 1.0.0
 */

const Apify = require('apify');
const { log } = Apify.utils;

// Importação dos módulos do sistema
const { parseInput } = require('./src/inputs');
const { setupBrowser } = require('./src/browser');
const { handleLoginFlow } = require('./src/auth');
const peopleExtractor = require('./src/extractors/people');
const companiesExtractor = require('./src/extractors/companies');
const { enrichData } = require('./src/enrichment');
const { formatOutput, saveOutput } = require('./src/output');
const { handleFailedRequest, setGlobalErrorHandler } = require('./src/errorHandling');
const { getSafetyMeasures } = require('./src/safety');

// Função principal do Apify Actor
Apify.main(async () => {
    log.info('Iniciando LinkedIn Sales Navigator Scraper');

    // Configurar tratamento global de erros
    setGlobalErrorHandler();
    
    // Obter e validar parâmetros de entrada
    const input = await Apify.getInput();
    const config = parseInput(input);
    
    // Configurar nível de log baseado no modo de depuração
    if (config.debugMode) {
        log.setLevel(log.LEVELS.DEBUG);
    }
    
    log.info('Configurações do scraper validadas', { config: { ...config, cookies: 'REDACTED' } });
    
    // Inicializar o estado do scraper
    const state = await loadOrInitializeState();
    
    // Configurar RequestQueue e ProcessedPagesSet
    const requestQueue = await Apify.openRequestQueue();
    const processedPagesSet = await Apify.openKeyValueStore('processed-pages');
    
    // Inicializar o RequestList com URLs iniciais
    await initializeRequests(config, requestQueue);
    
    // Configurar e iniciar o crawler
    const crawler = await setupCrawler(config, requestQueue, processedPagesSet, state);
    await crawler.run();
    
    // Salvar estatísticas finais
    await saveStats(state);
    
    log.info('Processo de scraping finalizado com sucesso', {
        totalExtracted: state.stats.totalExtracted,
        peopleExtracted: state.stats.peopleExtracted,
        companiesExtracted: state.stats.companiesExtracted,
        failedRequests: state.stats.failedRequests
    });
});

/**
 * Carrega o estado existente ou inicializa um novo
 * @returns {Object} Estado do scraper
 */
async function loadOrInitializeState() {
    const existingState = await Apify.getValue('STATE');
    
    if (existingState) {
        log.info('Estado existente carregado, continuando scraping de onde parou');
        return existingState;
    }
    
    // Inicializar novo estado
    const newState = {
        processedUrls: new Set(),
        lastPageProcessed: 0,
        currentSearchPageNumber: 1,
        stats: {
            totalExtracted: 0,
            peopleExtracted: 0,
            companiesExtracted: 0,
            enrichedData: 0,
            failedRequests: 0,
            startTime: new Date(),
            endTime: null
        }
    };
    
    await Apify.setValue('STATE', newState);
    return newState;
}

/**
 * Inicializa as requests iniciais na fila de requisições
 * @param {Object} config Configurações do scraper
 * @param {Object} requestQueue Fila de requisições
 */
async function initializeRequests(config, requestQueue) {
    // Adicionar URL de pesquisa principal ou URLs de perfis individuais
    if (config.searchUrl) {
        log.info(`Adicionando URL de pesquisa: ${config.searchUrl}`);
        await requestQueue.addRequest({
            url: config.searchUrl,
            userData: {
                label: 'SEARCH_PAGE',
                searchType: config.searchType,
                pageNumber: 1
            }
        });
    } else if (config.profileUrls && config.profileUrls.length > 0) {
        log.info(`Adicionando ${config.profileUrls.length} URLs de perfis individuais`);
        
        for (const url of config.profileUrls) {
            await requestQueue.addRequest({
                url,
                userData: {
                    label: 'PROFILE',
                    searchType: config.searchType,
                    isDetailPage: true
                }
            });
        }
    } else {
        throw new Error('Nenhuma URL de busca ou perfil foi fornecida. Forneça searchUrl ou profileUrls.');
    }
}

/**
 * Configura e retorna o crawler do Puppeteer
 * @param {Object} config Configurações do scraper
 * @param {Object} requestQueue Fila de requisições
 * @param {Object} processedPagesSet Conjunto de páginas processadas
 * @param {Object} state Estado atual do scraper
 * @returns {Object} Instância do crawler configurada
 */
async function setupCrawler(config, requestQueue, processedPagesSet, state) {
    // Obter configurações do navegador
    const browserConfig = setupBrowser(config);
    
    // Obter medidas de segurança para evitar detecção
    const safetyMeasures = getSafetyMeasures(config);
    
    // Criar e configurar o crawler
    const crawler = new Apify.PlaywrightCrawler({
        requestQueue,
        launchContext: {
            ...browserConfig.launchOptions,
            useChrome: false,
            proxyUrl: config.proxy.useApifyProxy ? undefined : config.proxy.proxyUrl,
            proxyConfiguration: config.proxy.useApifyProxy ? new Apify.ProxyConfiguration({
                groups: config.proxy.apifyProxyGroups,
                countryCode: config.proxy.apifyProxyCountry,
            }) : undefined,
        },
        maxConcurrency: config.maxConcurrency,
        handlePageTimeoutSecs: config.pageTimeout,
        persistCookiesPerSession: true,
        
        // Definir a função de manipulação da página
        handlePageFunction: async ({ request, page, session }) => {
            try {
                log.debug(`Processando ${request.url}`);
                
                // Aplicar medidas de segurança para evitar detecção
                await safetyMeasures.beforeNavigation(page);
                
                // Verificar se é necessário fazer login
                const isLoggedIn = await checkLoginStatus(page);
                
                if (!isLoggedIn) {
                    if (config.cookies) {
                        log.info('Aplicando cookies para autenticação');
                        await applyCookies(page, config.cookies);
                        await page.reload();
                    } else {
                        throw new Error('Não foi possível acessar o LinkedIn Sales Navigator. Forneça cookies válidos.');
                    }
                }
                
                // Aplicar medidas de segurança pós-navegação
                await safetyMeasures.afterNavigation(page);
                
                // Processar a página de acordo com seu tipo
                if (request.userData.label === 'SEARCH_PAGE') {
                    await processSearchPage(page, request, requestQueue, state, config);
                } else if (request.userData.label === 'PROFILE') {
                    await processProfilePage(page, request, state, config);
                }
                
                // Atualizar o estado a cada página processada
                state.processedUrls.add(request.url);
                await Apify.setValue('STATE', state);
                
                // Adicionar URL à lista de páginas processadas
                await processedPagesSet.setValue(request.url, true);
                
            } catch (error) {
                log.error(`Erro ao processar ${request.url}: ${error.message}`);
                state.stats.failedRequests++;
                await handleFailedRequest(error, request, session);
            }
        },
        
        // Definir função para lidar com falhas
        handleFailedRequestFunction: async ({ request, error }) => {
            log.error(`Falha ao processar ${request.url}: ${error.message}`);
            state.stats.failedRequests++;
            await Apify.pushData({
                '#error': true,
                url: request.url,
                errorMessage: error.message,
                errorStack: error.stack,
            });
        },
    });
    
    return crawler;
}

/**
 * Verifica se o usuário está autenticado
 * @param {Object} page Objeto da página do Puppeteer/Playwright
 * @returns {Promise<boolean>} True se estiver autenticado, False caso contrário
 */
async function checkLoginStatus(page) {
    try {
        // Verificar elementos que indicam que o usuário está autenticado
        const isLoggedIn = await page.evaluate(() => {
            // Verificar se há elementos que só aparecem quando autenticado
            const profileNavButton = document.querySelector('.global-nav__me');
            const salesNavMenu = document.querySelector('.global-nav__sales-nav');
            const loginForm = document.querySelector('.login__form');
            
            // Se o formulário de login estiver presente, não está autenticado
            if (loginForm) {
                return false;
            }
            
            // Se elementos de navegação estiverem presentes, está autenticado
            return !!(profileNavButton || salesNavMenu);
        });
        
        log.debug(`Status de autenticação: ${isLoggedIn ? 'Autenticado' : 'Não autenticado'}`);
        return isLoggedIn;
    } catch (error) {
        log.warning(`Erro ao verificar status de autenticação: ${error.message}`);
        return false;
    }
}

/**
 * Aplica cookies para autenticação
 * @param {Object} page Objeto da página do Puppeteer/Playwright
 * @param {string} cookiesString String JSON de cookies
 */
async function applyCookies(page, cookiesString) {
    try {
        // Converter string de cookies para objeto
        let cookies;
        try {
            cookies = JSON.parse(cookiesString);
        } catch (error) {
            throw new Error(`Formato de cookies inválido. Certifique-se de que é um JSON válido: ${error.message}`);
        }
        
        // Verificar se cookies é um array
        if (!Array.isArray(cookies)) {
            throw new Error('O formato de cookies deve ser um array de objetos de cookie');
        }
        
        // Aplicar cookies à página
        await page.context().clearCookies();
        await page.context().addCookies(cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            expires: cookie.expirationDate ? cookie.expirationDate : -1,
            httpOnly: cookie.httpOnly,
            secure: cookie.secure,
            sameSite: cookie.sameSite
        })));
        
        log.debug(`Aplicados ${cookies.length} cookies`);
    } catch (error) {
        log.error(`Erro ao aplicar cookies: ${error.message}`);
        throw error;
    }
}

/**
 * Processa uma página de resultados de pesquisa
 * @param {Object} page Objeto da página do Puppeteer/Playwright
 * @param {Object} request Objeto da requisição
 * @param {Object} requestQueue Fila de requisições
 * @param {Object} state Estado atual do scraper
 * @param {Object} config Configurações do scraper
 */
async function processSearchPage(page, request, requestQueue, state, config) {
    const { searchType, pageNumber } = request.userData;
    log.info(`Processando página de pesquisa ${pageNumber} para ${searchType}`);
    
    // Esperar carregamento dos resultados
    await page.waitForSelector(searchType === 'people' ? 
        'section.search-results__container' : 
        'section.search-results__container', 
    { timeout: 30000 });
    
    // Extrair dados da página de resultados
    let results = [];
    if (searchType === 'people') {
        results = await peopleExtractor.extractPeopleFromSearchResults(page, config);
    } else if (searchType === 'company') {
        results = await companiesExtractor.extractCompaniesFromSearchResults(page, config);
    }
    
    log.info(`Extraídos ${results.length} resultados da página ${pageNumber}`);
    
    // Enriquecer dados se configurado
    if (config.enrichData) {
        log.debug('Enriquecendo dados extraídos');
        for (const item of results) {
            await enrichData(item, config);
            state.stats.enrichedData++;
        }
    }
    
    // Formatar e salvar dados extraídos
    const formattedResults = formatOutput(results, config);
    await saveOutput(formattedResults, config);
    
    // Atualizar estatísticas
    state.stats.totalExtracted += results.length;
    if (searchType === 'people') {
        state.stats.peopleExtracted += results.length;
    } else {
        state.stats.companiesExtracted += results.length;
    }
    
    // Verificar se atingiu o limite máximo de itens
    if (config.maxItems > 0 && state.stats.totalExtracted >= config.maxItems) {
        log.info(`Limite máximo de ${config.maxItems} itens atingido. Encerrando scraping.`);
        return;
    }
    
    // Se configurado para pesquisa profunda, adicionar perfis individuais à fila
    if (config.deepSearch) {
        log.debug(`Modo de pesquisa profunda ativado. Adicionando ${results.length} perfis à fila`);
        for (const result of results) {
            if (result.profileUrl) {
                await requestQueue.addRequest({
                    url: result.profileUrl,
                    userData: {
                        label: 'PROFILE',
                        searchType,
                        isDetailPage: true
                    }
                });
            }
        }
    }
    
    // Verificar e adicionar próxima página à fila se existir
    await handlePagination(page, requestQueue, pageNumber, searchType, config);
}

/**
 * Processa uma página de perfil (pessoa ou empresa)
 * @param {Object} page Objeto da página do Puppeteer/Playwright
 * @param {Object} request Objeto da requisição
 * @param {Object} state Estado atual do scraper
 * @param {Object} config Configurações do scraper
 */
async function processProfilePage(page, request, state, config) {
    const { searchType } = request.userData;
    log.info(`Processando página de perfil de ${searchType}: ${request.url}`);
    
    // Extrair dados do perfil
    let profileData;
    if (searchType === 'people') {
        profileData = await peopleExtractor.extractPersonProfile(page, config);
    } else if (searchType === 'company') {
        profileData = await companiesExtractor.extractCompanyProfile(page, config);
    }
    
    // Enriquecer dados se configurado e não for uma página já extraída de modo profundo
    if (config.enrichData) {
        log.debug('Enriquecendo dados do perfil');
        await enrichData(profileData, config);
        state.stats.enrichedData++;
    }
    
    // Formatar e salvar dados extraídos
    const formattedResult = formatOutput([profileData], config);
    await saveOutput(formattedResult, config);
    
    // Atualizar estatísticas
    state.stats.totalExtracted++;
    if (searchType === 'people') {
        state.stats.peopleExtracted++;
    } else {
        state.stats.companiesExtracted++;
    }
    
    log.info(`Perfil de ${searchType} processado: ${profileData.name}`);
}

/**
 * Gerencia a paginação nas páginas de resultados de pesquisa
 * @param {Object} page Objeto da página do Puppeteer/Playwright
 * @param {Object} requestQueue Fila de requisições
 * @param {number} currentPage Número da página atual
 * @param {string} searchType Tipo de pesquisa ('people' ou 'company')
 * @param {Object} config Configurações do scraper
 */
async function handlePagination(page, requestQueue, currentPage, searchType, config) {
    // Verificar se há limite de páginas configurado
    if (config.maxPages && currentPage >= config.maxPages) {
        log.info(`Limite máximo de ${config.maxPages} páginas atingido. Não adicionando mais páginas.`);
        return;
    }
    
    try {
        // Verificar se existe um botão de próxima página
        const hasNextPage = await page.evaluate(() => {
            const nextButton = document.querySelector('button.artdeco-pagination__button--next:not(:disabled)');
            return !!nextButton;
        });
        
        if (!hasNextPage) {
            log.info('Não há mais páginas para processar');
            return;
        }
        
        // Obter URL da próxima página
        const nextPageUrl = await page.evaluate(() => {
            // Tentar obter URL do botão de próxima página
            const nextButton = document.querySelector('button.artdeco-pagination__button--next:not(:disabled)');
            if (nextButton) {
                // Clicar no botão e retornar a URL atual após o clique
                nextButton.click();
                return new Promise(resolve => {
                    setTimeout(() => resolve(window.location.href), 500);
                });
            }
            return null;
        });
        
        if (nextPageUrl) {
            log.info(`Adicionando próxima página (${currentPage + 1}) à fila: ${nextPageUrl}`);
            
            // Adicionar URL da próxima página à fila
            await requestQueue.addRequest({
                url: nextPageUrl,
                userData: {
                    label: 'SEARCH_PAGE',
                    searchType,
                    pageNumber: currentPage + 1
                }
            });
            
            // Atualizar número da página atual no estado
            state.currentSearchPageNumber = currentPage + 1;
        }
    } catch (error) {
        log.warning(`Erro ao processar paginação: ${error.message}`);
    }
}

/**
 * Salva estatísticas finais do scraping
 * @param {Object} state Estado atual do scraper
 */
async function saveStats(state) {
    // Atualizar horário de término
    state.stats.endTime = new Date();
    
    // Calcular duração total
    const durationMs = state.stats.endTime - state.stats.startTime;
    const durationFormatted = formatDuration(durationMs);
    
    // Compilar estatísticas finais
    const stats = {
        totalExtracted: state.stats.totalExtracted,
        peopleExtracted: state.stats.peopleExtracted,
        companiesExtracted: state.stats.companiesExtracted,
        enrichedData: state.stats.enrichedData,
        failedRequests: state.stats.failedRequests,
        startTime: state.stats.startTime,
        endTime: state.stats.endTime,
        duration: durationFormatted,
        itemsPerMinute: Math.round((state.stats.totalExtracted / (durationMs / 1000 / 60)) * 100) / 100
    };
    
    // Salvar estatísticas no armazenamento de valores-chave
    await Apify.setValue('OUTPUT_STATS', stats);
    
    log.info('Estatísticas finais salvas', stats);
}

/**
 * Formata uma duração em milissegundos para formato legível
 * @param {number} ms Duração em milissegundos
 * @returns {string} Duração formatada
 */
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    
    return `${hours}h ${minutes}m ${seconds}s`;
}