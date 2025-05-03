/**
 * Extrator de dados de pessoas (leads) do LinkedIn Sales Navigator
 * 
 * Este módulo contém funções para extrair informações detalhadas de perfis
 * de pessoas no LinkedIn Sales Navigator, incluindo dados pessoais,
 * informações profissionais e links para contato.
 */

const Apify = require('apify');
const { log } = Apify.utils;
const { getRandomDelay } = require('../utils/delay');
const selectors = require('../utils/selectors');

/**
 * Extrai dados de pessoas de uma página de resultados de pesquisa
 * @param {Object} page - Objeto da página do Puppeteer/Playwright
 * @param {Object} config - Configurações do scraper
 * @returns {Array} - Array de objetos com dados das pessoas
 */
async function extractPeopleFromSearchResults(page, config) {
    log.info('Extraindo dados de pessoas da página de resultados...');
    
    try {
        // Aguardar carregamento dos resultados
        await page.waitForSelector(selectors.people.searchResults.container, { timeout: 30000 });
        
        // Obter número de resultados exibidos na página
        const resultsCount = await page.evaluate((selector) => {
            return document.querySelectorAll(selector).length;
        }, selectors.people.searchResults.itemContainer);
        
        log.debug(`Encontrados ${resultsCount} resultados na página atual`);
        
        // Extrair dados de cada resultado
        const results = await page.evaluate((selectors) => {
            const items = Array.from(document.querySelectorAll(selectors.itemContainer));
            
            return items.map(item => {
                // Extrair dados básicos
                const profileElement = item.querySelector(selectors.profileLink);
                const nameElement = item.querySelector(selectors.name);
                const titleElement = item.querySelector(selectors.title);
                const locationElement = item.querySelector(selectors.location);
                const companyElement = item.querySelector(selectors.company);
                
                // Extrair URLs e IDs
                const profileUrl = profileElement ? profileElement.href : null;
                const profileId = profileUrl ? extractProfileId(profileUrl) : null;
                
                // Extrair imagem do perfil
                const profileImageElement = item.querySelector(selectors.profileImage);
                const profileImageUrl = profileImageElement ? 
                    (profileImageElement.src || (profileImageElement.style.backgroundImage || '').replace(/url\(['"]?(.*?)['"]?\)/i, '$1')) : 
                    null;
                
                // Compilar objeto de dados
                return {
                    linkedinProfileId: profileId,
                    profileUrl: profileUrl,
                    salesNavigatorUrl: profileUrl,
                    name: nameElement ? nameElement.textContent.trim() : null,
                    firstName: nameElement ? extractFirstName(nameElement.textContent.trim()) : null,
                    lastName: nameElement ? extractLastName(nameElement.textContent.trim()) : null,
                    title: titleElement ? titleElement.textContent.trim() : null,
                    location: locationElement ? locationElement.textContent.trim() : null,
                    company: companyElement ? companyElement.textContent.trim() : null,
                    profileImageUrl: profileImageUrl,
                    isConnected: !!item.querySelector(selectors.connectedIndicator),
                    sharedConnections: extractSharedConnections(item, selectors.sharedConnections),
                    timestamp: new Date().toISOString(),
                    source: 'linkedin_sales_navigator',
                    searchType: 'people'
                };
            });
            
            // Função auxiliar para extrair ID do perfil da URL
            function extractProfileId(url) {
                // Padrões possíveis para URLs do Sales Navigator
                const patterns = [
                    /\/sales\/profile\/([^\/]+)/, // Formato mais comum
                    /\/sales\/lead\/([^\/]+)/,   // Formato alternativo
                    /\/in\/([^\/]+)/            // Formato do LinkedIn padrão
                ];
                
                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
                
                return null;
            }
            
            // Extrair primeiro nome
            function extractFirstName(fullName) {
                if (!fullName) return null;
                return fullName.split(' ')[0];
            }
            
            // Extrair sobrenome
            function extractLastName(fullName) {
                if (!fullName) return null;
                const parts = fullName.split(' ');
                if (parts.length > 1) {
                    return parts.slice(1).join(' ');
                }
                return '';
            }
            
            // Extrair conexões compartilhadas
            function extractSharedConnections(item, selector) {
                const element = item.querySelector(selector);
                if (!element) return 0;
                
                const text = element.textContent.trim();
                const match = text.match(/(\d+)/);
                
                return match ? parseInt(match[1], 10) : 0;
            }
        }, selectors.people.searchResults);
        
        log.info(`Extraídos dados de ${results.length} pessoas com sucesso`);
        return results;
        
    } catch (error) {
        log.error(`Erro ao extrair dados de pessoas: ${error.message}`);
        throw error;
    }
}

/**
 * Extrai dados detalhados de um perfil de pessoa
 * @param {Object} page - Objeto da página do Puppeteer/Playwright
 * @param {Object} config - Configurações do scraper
 * @returns {Object} - Objeto com dados detalhados da pessoa
 */
async function extractPersonProfile(page, config) {
    log.info('Extraindo dados detalhados do perfil...');
    
    try {
        // Aguardar carregamento completo do perfil
        await page.waitForSelector(selectors.people.profile.container, { timeout: 30000 });
        
        // Obter ID do perfil da URL atual
        const url = page.url();
        const profileId = extractProfileIdFromUrl(url);
        
        // Extrair dados básicos do perfil
        const basicInfo = await extractBasicProfileInfo(page);
        
        // Extrair experiência profissional
        const experience = await extractExperience(page);
        
        // Extrair educação
        const education = await extractEducation(page);
        
        // Extrair habilidades
        const skills = await extractSkills(page);
        
        // Extrair informações adicionais
        const additionalInfo = await extractAdditionalInfo(page);
        
        // Extrair atividades recentes
        const recentActivities = config.extractActivities ? await extractRecentActivities(page) : [];
        
        // Compilar todos os dados
        const profileData = {
            ...basicInfo,
            linkedinProfileId: profileId,
            experience,
            education,
            skills,
            ...additionalInfo,
            recentActivities,
            timestamp: new Date().toISOString(),
            source: 'linkedin_sales_navigator',
            searchType: 'people',
            profileData: true
        };
        
        log.info(`Extração de dados do perfil concluída: ${basicInfo.name}`);
        return profileData;
        
    } catch (error) {
        log.error(`Erro ao extrair dados do perfil: ${error.message}`);
        throw error;
    }
}

/**
 * Extrai informações básicas do perfil
 * @param {Object} page - Objeto da página
 * @returns {Object} - Dados básicos do perfil
 */
async function extractBasicProfileInfo(page) {
    return page.evaluate((selectors) => {
        const nameElement = document.querySelector(selectors.name);
        const titleElement = document.querySelector(selectors.title);
        const locationElement = document.querySelector(selectors.location);
        const companyElement = document.querySelector(selectors.company);
        const aboutElement = document.querySelector(selectors.about);
        const profileImageElement = document.querySelector(selectors.profileImage);
        
        // Extrair nome completo e separá-lo
        const fullName = nameElement ? nameElement.textContent.trim() : null;
        let firstName = null;
        let lastName = null;
        
        if (fullName) {
            const parts = fullName.split(' ');
            firstName = parts[0];
            if (parts.length > 1) {
                lastName = parts.slice(1).join(' ');
            }
        }
        
        // Extrair URL da imagem de perfil
        const profileImageUrl = profileImageElement ? 
            (profileImageElement.src || (profileImageElement.style.backgroundImage || '').replace(/url\(['"]?(.*?)['"]?\)/i, '$1')) : 
            null;
            
        return {
            name: fullName,
            firstName,
            lastName,
            title: titleElement ? titleElement.textContent.trim() : null,
            location: locationElement ? locationElement.textContent.trim() : null,
            company: companyElement ? companyElement.textContent.trim() : null,
            about: aboutElement ? aboutElement.textContent.trim() : null,
            profileImageUrl,
            profileUrl: window.location.href,
            salesNavigatorUrl: window.location.href
        };
    }, selectors.people.profile.basic);
}

/**
 * Extrai experiência profissional
 * @param {Object} page - Objeto da página
 * @returns {Array} - Lista de experiências profissionais
 */
async function extractExperience(page) {
    return page.evaluate((selectors) => {
        const experienceItems = Array.from(document.querySelectorAll(selectors.container));
        
        return experienceItems.map(item => {
            const titleElement = item.querySelector(selectors.title);
            const companyElement = item.querySelector(selectors.company);
            const dateRangeElement = item.querySelector(selectors.dateRange);
            const locationElement = item.querySelector(selectors.location);
            const descriptionElement = item.querySelector(selectors.description);
            
            // Processar datas
            let startDate = null;
            let endDate = null;
            let current = false;
            
            if (dateRangeElement) {
                const dateText = dateRangeElement.textContent.trim();
                const dateMatch = dateText.match(/(\w+\s+\d{4})\s*(?:-|–)\s*(?:(\w+\s+\d{4})|Present)/i);
                
                if (dateMatch) {
                    startDate = dateMatch[1];
                    if (dateMatch[2]) {
                        endDate = dateMatch[2];
                    } else {
                        current = true;
                    }
                }
            }
            
            return {
                title: titleElement ? titleElement.textContent.trim() : null,
                company: companyElement ? companyElement.textContent.trim() : null,
                startDate,
                endDate,
                current,
                location: locationElement ? locationElement.textContent.trim() : null,
                description: descriptionElement ? descriptionElement.textContent.trim() : null
            };
        });
    }, selectors.people.profile.experience);
}

/**
 * Extrai informações educacionais
 * @param {Object} page - Objeto da página
 * @returns {Array} - Lista de formações educacionais
 */
async function extractEducation(page) {
    return page.evaluate((selectors) => {
        const educationItems = Array.from(document.querySelectorAll(selectors.container));
        
        return educationItems.map(item => {
            const schoolElement = item.querySelector(selectors.school);
            const degreeElement = item.querySelector(selectors.degree);
            const fieldElement = item.querySelector(selectors.field);
            const dateRangeElement = item.querySelector(selectors.dateRange);
            
            // Processar datas
            let startYear = null;
            let endYear = null;
            
            if (dateRangeElement) {
                const dateText = dateRangeElement.textContent.trim();
                const yearMatch = dateText.match(/(\d{4})\s*(?:-|–)\s*(\d{4})|(\d{4})/);
                
                if (yearMatch) {
                    if (yearMatch[1] && yearMatch[2]) {
                        startYear = parseInt(yearMatch[1], 10);
                        endYear = parseInt(yearMatch[2], 10);
                    } else if (yearMatch[3]) {
                        endYear = parseInt(yearMatch[3], 10);
                    }
                }
            }
            
            return {
                school: schoolElement ? schoolElement.textContent.trim() : null,
                degree: degreeElement ? degreeElement.textContent.trim() : null,
                field: fieldElement ? fieldElement.textContent.trim() : null,
                startYear,
                endYear
            };
        });
    }, selectors.people.profile.education);
}

/**
 * Extrai habilidades
 * @param {Object} page - Objeto da página
 * @returns {Array} - Lista de habilidades
 */
async function extractSkills(page) {
    return page.evaluate((selectors) => {
        // Tentar encontrar a seção de habilidades
        const skillsContainer = document.querySelector(selectors.container);
        if (!skillsContainer) return [];
        
        // Verificar se há um botão "mostrar mais" e clicar nele se necessário
        const showMoreButton = skillsContainer.querySelector(selectors.showMore);
        if (showMoreButton) {
            showMoreButton.click();
            // Aguardar um momento para carregar todas as habilidades
            return new Promise(resolve => {
                setTimeout(() => {
                    const skillElements = Array.from(skillsContainer.querySelectorAll(selectors.skillItem));
                    const skills = skillElements.map(item => item.textContent.trim());
                    resolve(skills);
                }, 1000);
            });
        } else {
            // Extrair habilidades diretamente
            const skillElements = Array.from(skillsContainer.querySelectorAll(selectors.skillItem));
            return skillElements.map(item => item.textContent.trim());
        }
    }, selectors.people.profile.skills);
}

/**
 * Extrai informações adicionais do perfil
 * @param {Object} page - Objeto da página
 * @returns {Object} - Objeto com informações adicionais
 */
async function extractAdditionalInfo(page) {
    return page.evaluate((selectors) => {
        // Função auxiliar para encontrar elemento por seletor e extrair texto
        const extractText = (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : null;
        };
        
        // Extrair vários campos adicionais
        const emailElement = document.querySelector(selectors.email);
        let email = null;
        
        // Tentar extrair e-mail, que geralmente está em um formato protegido
        if (emailElement) {
            // O e-mail pode estar em texto normal
            email = emailElement.textContent.trim();
            
            // Ou pode estar em um formato href="mailto:email@example.com"
            if (!email || email.length === 0) {
                const mailtoHref = emailElement.getAttribute('href');
                if (mailtoHref && mailtoHref.startsWith('mailto:')) {
                    email = mailtoHref.substring(7).trim();
                }
            }
        }
        
        // Extrair URLs de redes sociais e site
        const websiteElement = document.querySelector(selectors.website);
        const twitterElement = document.querySelector(selectors.twitter);
        const facebookElement = document.querySelector(selectors.facebook);
        
        let website = null, twitter = null, facebook = null;
        
        if (websiteElement) {
            website = websiteElement.getAttribute('href') || websiteElement.textContent.trim();
        }
        
        if (twitterElement) {
            twitter = twitterElement.getAttribute('href') || twitterElement.textContent.trim();
        }
        
        if (facebookElement) {
            facebook = facebookElement.getAttribute('href') || facebookElement.textContent.trim();
        }
        
        // Compilar e retornar objeto com dados adicionais
        return {
            email,
            phone: extractText(selectors.phone),
            website,
            twitter,
            facebook,
            birthday: extractText(selectors.birthday),
            languages: extractLanguages(selectors.languages),
            connections: extractConnections(selectors.connections)
        };
        
        // Função auxiliar para extrair idiomas
        function extractLanguages(selector) {
            const container = document.querySelector(selector);
            if (!container) return [];
            
            const langElements = Array.from(container.querySelectorAll('li'));
            return langElements.map(el => el.textContent.trim());
        }
        
        // Função auxiliar para extrair número de conexões
        function extractConnections(selector) {
            const element = document.querySelector(selector);
            if (!element) return null;
            
            const text = element.textContent.trim();
            const match = text.match(/(\d+)(\+)?\s+connections/i);
            
            if (match) {
                let count = parseInt(match[1], 10);
                if (match[2] === '+') {
                    // Se houver um sinal "+" após o número, é um valor aproximado
                    return { count, approximate: true };
                }
                return { count, approximate: false };
            }
            
            return null;
        }
    }, selectors.people.profile.additional);
}

/**
 * Extrai atividades recentes do perfil
 * @param {Object} page - Objeto da página
 * @returns {Array} - Lista de atividades recentes
 */
async function extractRecentActivities(page) {
    try {
        // Navegar para a seção de atividades se necessário
        const hasActivityTab = await page.evaluate((selector) => {
            const tab = document.querySelector(selector);
            return tab !== null;
        }, selectors.people.profile.activityTab);
        
        if (!hasActivityTab) {
            return [];
        }
        
        // Clicar na aba de atividades
        await page.click(selectors.people.profile.activityTab);
        
        // Aguardar carregamento das atividades
        await page.waitForSelector(selectors.people.profile.activity.activityItems, { timeout: 10000 })
            .catch(() => console.log('Nenhuma atividade encontrada ou timeout'));
        
        // Extrair dados das atividades
        return page.evaluate((selectors) => {
            const activityItems = Array.from(document.querySelectorAll(selectors.activityItems));
            if (!activityItems.length) return [];
            
            return activityItems.slice(0, 5).map(item => {
                const typeElement = item.querySelector(selectors.activityType);
                const contentElement = item.querySelector(selectors.activityContent);
                const dateElement = item.querySelector(selectors.activityDate);
                const linkElement = item.querySelector(selectors.activityLink);
                
                return {
                    type: typeElement ? typeElement.textContent.trim() : null,
                    content: contentElement ? contentElement.textContent.trim() : null,
                    date: dateElement ? dateElement.textContent.trim() : null,
                    link: linkElement ? linkElement.getAttribute('href') : null
                };
            });
        }, selectors.people.profile.activity);
        
    } catch (error) {
        console.error(`Erro ao extrair atividades recentes: ${error.message}`);
        return [];
    }
}

/**
 * Extrair ID do perfil de uma URL
 * @param {string} url - URL do perfil
 * @returns {string|null} - ID do perfil ou null
 */
function extractProfileIdFromUrl(url) {
    const patterns = [
        /\/sales\/profile\/([^\/]+)/, // Formato mais comum
        /\/sales\/lead\/([^\/]+)/,   // Formato alternativo
        /\/in\/([^\/]+)/            // Formato do LinkedIn padrão
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    
    return null;
}

module.exports = {
    extractPeopleFromSearchResults,
    extractPersonProfile,
    extractProfileIdFromUrl
};