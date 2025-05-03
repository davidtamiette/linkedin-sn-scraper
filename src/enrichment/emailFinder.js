/**
 * Módulo de Descoberta de E-mails
 * 
 * Este módulo é responsável por implementar diferentes estratégias
 * para descobrir e-mails de contatos com base em seus dados do LinkedIn.
 * 
 * A descoberta de e-mails é uma das principais funcionalidades diferenciais
 * do nosso ator em relação a concorrência.
 */

const Apify = require('apify');
const { log } = Apify.utils;
const { gotScraping } = Apify.utils;
const dns = require('dns').promises;

/**
 * Encontra e-mail usando padrões comuns
 * @param {Object} data Dados da pessoa
 * @returns {Promise<Object|null>} Objeto com e-mail encontrado ou null
 */
async function findEmailByPattern(data) {
    log.debug(`Buscando e-mail por padrão para ${data.fullName || data.firstName + ' ' + data.lastName}`);
    
    // Verificar se temos os dados necessários
    if (!data.firstName || !data.lastName || !data.companyDomain) {
        return null;
    }
    
    try {
        // Criar padrões comuns de e-mail baseados no nome e domínio da empresa
        const firstName = data.firstName.toLowerCase();
        const lastName = data.lastName.toLowerCase();
        const domain = data.companyDomain;
        
        // Criar padrões de e-mail comuns
        const patterns = [
            `${firstName}@${domain}`,
            `${firstName}.${lastName}@${domain}`,
            `${firstName}${lastName}@${domain}`,
            `${firstName}_${lastName}@${domain}`,
            `${firstName[0]}${lastName}@${domain}`,
            `${firstName[0]}.${lastName}@${domain}`,
            `${firstName}.${lastName[0]}@${domain}`,
            `${lastName}.${firstName}@${domain}`,
            `${lastName}${firstName}@${domain}`,
            `${lastName}.${firstName[0]}@${domain}`,
            `${firstName}-${lastName}@${domain}`
        ];
        
        // Verificar cada padrão de e-mail
        for (const email of patterns) {
            const isValid = await verifyEmailFormat(email);
            if (isValid) {
                // Verificar se o e-mail existe
                const exists = await checkEmailExistence(email);
                if (exists) {
                    return { email, source: 'pattern' };
                }
            }
        }
        
        return null;
    } catch (error) {
        log.debug(`Erro ao buscar e-mail por padrão: ${error.message}`);
        return null;
    }
}

/**
 * Encontra e-mail a partir de perfis sociais
 * @param {Object} data Dados da pessoa
 * @returns {Promise<Object|null>} Objeto com e-mail encontrado ou null
 */
async function findEmailFromSocial(data) {
    log.debug(`Buscando e-mail a partir de perfis sociais para ${data.fullName || data.firstName + ' ' + data.lastName}`);
    
    // Verificar se temos os dados necessários
    if (!data.firstName || !data.lastName) {
        return null;
    }
    
    try {
        // Construir URL de busca no Google
        const searchQuery = `${data.firstName} ${data.lastName} ${data.company || ''} email contact`;
        const encodedQuery = encodeURIComponent(searchQuery);
        const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
        
        // Fazer requisição para o Google
        const response = await gotScraping({
            url: searchUrl,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = response.body;
        
        // Extrair e-mails do HTML
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
        const matches = html.match(emailRegex);
        
        if (matches && matches.length > 0) {
            // Filtrar e-mails
            const filteredEmails = filterValidEmails(matches, data);
            
            if (filteredEmails.length > 0) {
                // Verificar se o primeiro e-mail existe
                const email = filteredEmails[0];
                const exists = await checkEmailExistence(email);
                
                if (exists) {
                    return { email, source: 'social' };
                }
            }
        }
        
        // Tentar buscar em sites de contato pessoal
        return findEmailFromPersonalSites(data);
    } catch (error) {
        log.debug(`Erro ao buscar e-mail de perfis sociais: ${error.message}`);
        return null;
    }
}

/**
 * Encontra e-mail a partir de sites pessoais
 * @param {Object} data Dados da pessoa
 * @returns {Promise<Object|null>} Objeto com e-mail encontrado ou null
 */
async function findEmailFromPersonalSites(data) {
    log.debug(`Buscando e-mail em sites pessoais para ${data.fullName || data.firstName + ' ' + data.lastName}`);
    
    try {
        // Construir URL de busca no Google para sites pessoais
        const searchQuery = `${data.firstName} ${data.lastName} personal website portfolio`;
        const encodedQuery = encodeURIComponent(searchQuery);
        const searchUrl = `https://www.google.com/search?q=${encodedQuery}`;
        
        // Fazer requisição para o Google
        const response = await gotScraping({
            url: searchUrl,
            responseType: 'text',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const html = response.body;
        
        // Extrair URLs de sites pessoais dos resultados
        const $ = Apify.utils.cheerio.load(html);
        const urls = [];
        
        $('a[href^="http"]').each((_, el) => {
            const href = $(el).attr('href');
            if (href && href.startsWith('http') && 
                !href.includes('google.com') && 
                !href.includes('linkedin.com') &&
                !href.includes('facebook.com') &&
                !href.includes('twitter.com')) {
                urls.push(href);
            }
        });
        
        // Visitar os primeiros sites (limitar para não consumir muitos recursos)
        for (let i = 0; i < Math.min(urls.length, 3); i++) {
            try {
                // Fazer requisição para o site
                const siteResponse = await gotScraping({
                    url: urls[i],
                    responseType: 'text',
                    timeout: 10000
                });
                
                const siteHtml = siteResponse.body;
                
                // Extrair e-mails do HTML
                const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
                const matches = siteHtml.match(emailRegex);
                
                if (matches && matches.length > 0) {
                    // Filtrar e-mails
                    const filteredEmails = filterValidEmails(matches, data);
                    
                    if (filteredEmails.length > 0) {
                        // Verificar se o primeiro e-mail existe
                        const email = filteredEmails[0];
                        const exists = await checkEmailExistence(email);
                        
                        if (exists) {
                            return { email, source: 'personal_site' };
                        }
                    }
                }
                
                // Aguardar um pouco antes de acessar o próximo site
                await Apify.utils.sleep(1000);
                
            } catch (siteError) {
                // Ignorar erros e continuar para o próximo site
                continue;
            }
        }
        
        return null;
    } catch (error) {
        log.debug(`Erro ao buscar e-mail em sites pessoais: ${error.message}`);
        return null;
    }
}

/**
 * Encontra e-mail usando uma API externa
 * @param {Object} data Dados da pessoa
 * @param {string} apiKey Chave da API (opcional)
 * @returns {Promise<Object|null>} Objeto com e-mail encontrado ou null
 */
async function findEmailFromApi(data, apiKey) {
    log.debug(`Buscando e-mail via API para ${data.fullName || data.firstName + ' ' + data.lastName}`);
    
    // Verificar se temos os dados necessários
    if (!data.firstName || !data.lastName || !data.companyDomain) {
        return null;
    }
    
    try {
        // Implementar integração com APIs de descoberta de e-mail
        // Exemplos de APIs: Hunter.io, Clearbit, RocketReach, etc.
        
        // Exemplo de implementação com Hunter.io (mockup)
        if (apiKey) {
            const url = `https://api.hunter.io/v2/email-finder?domain=${data.companyDomain}&first_name=${data.firstName}&last_name=${data.lastName}&api_key=${apiKey}`;
            
            try {
                const response = await gotScraping({
                    url,
                    responseType: 'json'
                });
                
                if (response.body && response.body.data && response.body.data.email) {
                    const email = response.body.data.email;
                    return { email, source: 'api', confidence: response.body.data.score };
                }
            } catch (apiError) {
                log.debug(`Erro na API de e-mail: ${apiError.message}`);
            }
        }
        
        // Implementação alternativa sem API key (gratuita)
        // Esta é uma implementação simplificada para fins educacionais
        const domainMxRecords = await getMxRecords(data.companyDomain);
        
        if (domainMxRecords) {
            // Criar padrões comuns de e-mail baseados no nome e domínio da empresa
            const firstName = data.firstName.toLowerCase();
            const lastName = data.lastName.toLowerCase();
            const domain = data.companyDomain;
            
            // Determinar padrão de e-mail mais provável com base no serviço de e-mail
            let likelyPattern;
            
            if (domainMxRecords.includes('google') || domainMxRecords.includes('gmail')) {
                // Google Workspace geralmente usa firstname.lastname
                likelyPattern = `${firstName}.${lastName}@${domain}`;
            } else if (domainMxRecords.includes('microsoft') || domainMxRecords.includes('outlook')) {
                // Microsoft geralmente usa firstname ou firstname.lastname
                likelyPattern = [
                    `${firstName}@${domain}`,
                    `${firstName}.${lastName}@${domain}`
                ];
            } else {
                // Padrão genérico
                likelyPattern = [
                    `${firstName}.${lastName}@${domain}`,
                    `${firstName}@${domain}`,
                    `${firstName[0]}.${lastName}@${domain}`
                ];
            }
            
            // Verificar se os e-mails existem
            if (Array.isArray(likelyPattern)) {
                for (const pattern of likelyPattern) {
                    const exists = await checkEmailExistence(pattern);
                    if (exists) {
                        return { email: pattern, source: 'mx_inference' };
                    }
                }
            } else {
                const exists = await checkEmailExistence(likelyPattern);
                if (exists) {
                    return { email: likelyPattern, source: 'mx_inference' };
                }
            }
        }
        
        return null;
    } catch (error) {
        log.debug(`Erro ao buscar e-mail via API: ${error.message}`);
        return null;
    }
}

/**
 * Valida um e-mail
 * @param {string} email Endereço de e-mail
 * @returns {Promise<boolean>} True se o e-mail for válido, False caso contrário
 */
async function validateEmail(email) {
    log.debug(`Validando e-mail: ${email}`);
    
    try {
        // Verificar formato do e-mail
        const isValidFormat = verifyEmailFormat(email);
        if (!isValidFormat) {
            return false;
        }
        
        // Verificar existência do domínio
        const domain = email.split('@')[1];
        const hasMx = await hasMxRecords(domain);
        if (!hasMx) {
            return false;
        }
        
        // Opcional: Verificar se o e-mail existe
        // Nota: Esta verificação pode ser intrusiva e gerar falsos positivos/negativos
        // const exists = await checkEmailExistence(email);
        // return exists;
        
        return true;
    } catch (error) {
        log.debug(`Erro ao validar e-mail: ${error.message}`);
        return false;
    }
}

/**
 * Verifica se o formato do e-mail é válido
 * @param {string} email Endereço de e-mail
 * @returns {boolean} True se o formato for válido, False caso contrário
 */
function verifyEmailFormat(email) {
    // Regex para validação básica de e-mail
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Verifica se um domínio tem registros MX
 * @param {string} domain Domínio a ser verificado
 * @returns {Promise<boolean>} True se o domínio tiver registros MX, False caso contrário
 */
async function hasMxRecords(domain) {
    try {
        const records = await dns.resolveMx(domain);
        return records && records.length > 0;
    } catch (error) {
        return false;
    }
}

/**
 * Obtém os registros MX de um domínio
 * @param {string} domain Domínio a ser verificado
 * @returns {Promise<string[]|null>} Array de registros MX ou null
 */
async function getMxRecords(domain) {
    try {
        const records = await dns.resolveMx(domain);
        if (records && records.length > 0) {
            return records.map(record => record.exchange.toLowerCase());
        }
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Verifica se um e-mail existe
 * @param {string} email Endereço de e-mail
 * @returns {Promise<boolean>} True se o e-mail existir, False caso contrário
 */
async function checkEmailExistence(email) {
    // Nota: Verificação real de existência de e-mail requer SMTP
    // Esta é uma implementação simulada
    
    // Em ambiente de produção, você poderia usar serviços como:
    // - APIs de verificação de e-mail (Hunter.io, NeverBounce, etc.)
    // - Implementação própria com SMTP (mais complexa e potencialmente bloqueada)
    
    // Para fins deste exemplo, vamos simular a verificação
    const domain = email.split('@')[1];
    const hasMx = await hasMxRecords(domain);
    
    // Considerar válido se o domínio tiver registros MX
    return hasMx;
}

/**
 * Filtra e-mails válidos e relevantes para uma pessoa
 * @param {string[]} emails Lista de e-mails
 * @param {Object} data Dados da pessoa
 * @returns {string[]} Lista filtrada de e-mails
 */
function filterValidEmails(emails, data) {
    if (!emails || emails.length === 0) {
        return [];
    }
    
    // Filtrar e-mails inválidos e genéricos
    const validEmails = emails.filter(email => {
        // Verificar formato do e-mail
        if (!verifyEmailFormat(email)) {
            return false;
        }
        
        // Filtrar e-mails genéricos
        const genericPrefixes = [
            'info', 'contact', 'hello', 'support', 'admin', 'sales',
            'marketing', 'help', 'noreply', 'no-reply', 'webmaster'
        ];
        
        const emailPrefix = email.split('@')[0].toLowerCase();
        if (genericPrefixes.includes(emailPrefix)) {
            return false;
        }
        
        // Verificar se o e-mail contém partes do nome da pessoa
        const firstName = data.firstName ? data.firstName.toLowerCase() : '';
        const lastName = data.lastName ? data.lastName.toLowerCase() : '';
        
        if (firstName && lastName) {
            // Verificar se o e-mail contém partes do nome (para evitar falsos positivos)
            return emailPrefix.includes(firstName) || 
                   emailPrefix.includes(lastName) || 
                   emailPrefix.includes(firstName[0] + lastName) ||
                   emailPrefix.includes(firstName + lastName[0]);
        }
        
        return true;
    });
    
    return validEmails;
}

module.exports = {
    findEmailByPattern,
    findEmailFromSocial,
    findEmailFromApi,
    validateEmail
};