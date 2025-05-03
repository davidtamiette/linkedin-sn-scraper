/**
 * Utilitários para gerenciamento de atrasos
 * 
 * Este módulo fornece funções para gerenciar atrasos entre requisições,
 * ajudando a evitar padrões de tempo que poderiam levar à detecção do scraper.
 */

const Apify = require('apify');
const { log } = Apify.utils;

/**
 * Gera um atraso aleatório entre valores mínimo e máximo
 * @param {number} min Atraso mínimo em milissegundos
 * @param {number} max Atraso máximo em milissegundos
 * @returns {number} Atraso aleatório em milissegundos
 */
function getRandomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Aplica um atraso aleatório
 * @param {number} min Atraso mínimo em milissegundos
 * @param {number} max Atraso máximo em milissegundos
 * @returns {Promise<void>} Promise resolvida após o atraso
 */
async function applyRandomDelay(min, max) {
    const delay = getRandomDelay(min, max);
    log.debug(`Aplicando atraso aleatório de ${delay}ms`);
    await Apify.utils.sleep(delay);
}

/**
 * Atraso exponencial com jitter para requisições que falharam
 * @param {number} attempt Número da tentativa atual
 * @param {number} baseDelay Atraso base em milissegundos
 * @param {number} maxDelay Atraso máximo em milissegundos
 * @returns {Promise<number>} Promise resolvida após o atraso, retornando o atraso aplicado
 */
async function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
    // Calcular atraso exponencial: baseDelay * 2^attempt
    let delay = baseDelay * Math.pow(2, attempt);
    
    // Adicionar jitter para evitar sincronização de requisições
    delay = delay * (0.5 + Math.random());
    
    // Limitar ao atraso máximo
    delay = Math.min(delay, maxDelay);
    
    log.debug(`Aplicando backoff exponencial de ${Math.round(delay)}ms para tentativa ${attempt}`);
    await Apify.utils.sleep(delay);
    
    return delay;
}

/**
 * Aplica atraso ponderado com base no tipo de página
 * @param {string} pageType Tipo de página ('search', 'profile', etc.)
 * @param {Object} config Configurações do scraper
 * @returns {Promise<void>} Promise resolvida após o atraso
 */
async function applyWeightedDelay(pageType, config) {
    // Definir fatores de peso para diferentes tipos de página
    const weightFactors = {
        search: 1.0,      // Atraso normal para páginas de pesquisa
        profile: 1.5,     // Atraso maior para perfis (mais detalhados)
        login: 2.0,       // Atraso ainda maior para login (mais sensível)
        navigation: 0.8   // Atraso menor para navegação simples
    };
    
    // Obter fator de peso para o tipo de página
    const factor = weightFactors[pageType] || 1.0;
    
    // Calcular atraso com base no fator
    const min = config.minDelay * 1000 * factor;
    const max = config.maxDelay * 1000 * factor;
    
    await applyRandomDelay(min, max);
}

/**
 * Gerenciador de taxa de requisições
 * Controla a taxa de requisições para evitar sobrecarregar o servidor alvo
 */
class RateLimiter {
    /**
     * @param {number} maxRequestsPerMinute Número máximo de requisições por minuto
     */
    constructor(maxRequestsPerMinute) {
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.requestTimestamps = [];
    }
    
    /**
     * Aguarda se necessário e registra uma nova requisição
     * @returns {Promise<void>} Promise resolvida quando é seguro fazer uma requisição
     */
    async acquire() {
        // Remover timestamps antigos (mais de 1 minuto)
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => 
            now - timestamp < 60000
        );
        
        // Verificar se atingiu o limite de requisições
        if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
            // Calcular tempo de espera necessário
            const oldestTimestamp = this.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestTimestamp);
            
            if (waitTime > 0) {
                log.debug(`Limite de taxa atingido. Aguardando ${waitTime}ms`);
                await Apify.utils.sleep(waitTime);
            }
        }
        
        // Registrar nova requisição
        this.requestTimestamps.push(Date.now());
    }
    
    /**
     * Retorna o número de requisições na janela atual (último minuto)
     * @returns {number} Número de requisições
     */
    getCurrentRate() {
        // Remover timestamps antigos
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => 
            now - timestamp < 60000
        );
        
        return this.requestTimestamps.length;
    }
    
    /**
     * Verifica se a taxa atual está próxima do limite
     * @param {number} thresholdPercentage Percentual do limite para considerar como próximo
     * @returns {boolean} True se estiver próximo do limite, False caso contrário
     */
    isNearLimit(thresholdPercentage = 80) {
        const currentRate = this.getCurrentRate();
        const threshold = (this.maxRequestsPerMinute * thresholdPercentage) / 100;
        
        return currentRate >= threshold;
    }
}

module.exports = {
    getRandomDelay,
    applyRandomDelay,
    exponentialBackoff,
    applyWeightedDelay,
    RateLimiter
};