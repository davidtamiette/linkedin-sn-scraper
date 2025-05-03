# LinkedIn Sales Navigator Scraper

Este é um **Ator Apify** altamente eficiente para extrair dados do LinkedIn Sales Navigator, focado em performance e baixo consumo de recursos. Ideal para profissionais de vendas, recrutamento e marketing que precisam coletar leads qualificados e informações de empresas.

## 🌟 Características

- **Extração de dados de alta qualidade** de pessoas e empresas do LinkedIn Sales Navigator
- **Baixo consumo de recursos** para maximizar a eficiência e reduzir custos
- **Descoberta de e-mails de contato** com múltiplas estratégias de enriquecimento
- **Mecanismos anti-detecção** para prevenir bloqueios e captchas
- **Suporte a pesquisa em lote** para extrair grandes volumes de dados
- **Exportação em múltiplos formatos** (JSON, CSV, XLSX)
- **API REST** para integração com outros sistemas
- **Rotação de proxies** para maior eficiência e evitar bloqueios
- **Interface de usuário intuitiva** no Apify

## 📋 Requisitos

- Conta no **Apify** ([registre-se gratuitamente](https://apify.com/signup))
- Conta no **LinkedIn Sales Navigator** (premium)
- Cookies de autenticação válidos do LinkedIn Sales Navigator

## 🚀 Instalação

### Usar diretamente na plataforma Apify

1. Acesse a [página do ator no Apify Store](https://apify.com/davidtamiette/linkedin-sales-navigator-scraper)
2. Clique em "Try for free" ou "Subscribe"
3. Configure os parâmetros de entrada conforme suas necessidades
4. Execute o ator

### Executar localmente

```bash
# Clonar o repositório
git clone https://github.com/davidtamiette/linkedin-sn-scraper.git

# Entrar no diretório
cd linkedin-sn-scraper

# Instalar dependências
npm install

# Executar localmente
npm start
```

## ⚙️ Configuração

O ator aceita os seguintes parâmetros de entrada:

| Parâmetro | Descrição | Tipo | Obrigatório |
|-----------|-----------|------|-------------|
| `searchUrl` | URL de pesquisa do LinkedIn Sales Navigator | String | Não* |
| `profileUrls` | Lista de URLs de perfis do Sales Navigator | Array | Não* |
| `searchType` | Tipo de pesquisa: "people" ou "company" | String | Sim |
| `cookies` | Cookies da sua sessão do LinkedIn Sales Navigator | String | Sim |
| `maxItems` | Número máximo de itens a serem extraídos | Number | Não |
| `deepSearch` | Habilita pesquisa profunda (visita cada perfil) | Boolean | Não |
| `enrichData` | Habilita enriquecimento de dados (e-mail, etc.) | Boolean | Não |
| `minDelay` | Atraso mínimo entre requisições (segundos) | Number | Não |
| `maxDelay` | Atraso máximo entre requisições (segundos) | Number | Não |
| `maxConcurrency` | Número máximo de janelas simultâneas | Number | Não |
| `proxy` | Configuração de proxy | Object | Não |
| `outputFormat` | Formato de saída (json, csv, xlsx, all) | String | Não |

*Pelo menos um dos parâmetros `searchUrl` ou `profileUrls` deve ser fornecido.

### Exemplos de Configuração

#### Extrair leads de uma pesquisa no Sales Navigator

```json
{
  "searchUrl": "https://www.linkedin.com/sales/search/people?query=(recentSearchParam:(doLogHistory:true),spellCorrectionEnabled:true,keywords:founder)",
  "searchType": "people",
  "cookies": "[Seus cookies do LinkedIn Sales Navigator]",
  "maxItems": 100,
  "deepSearch": true,
  "enrichData": true
}
```

#### Extrair detalhes de empresas específicas

```json
{
  "profileUrls": [
    "https://www.linkedin.com/sales/company/12345",
    "https://www.linkedin.com/sales/company/67890"
  ],
  "searchType": "company",
  "cookies": "[Seus cookies do LinkedIn Sales Navigator]",
  "enrichData": true,
  "outputFormat": "csv"
}
```

## 📊 Dados Extraídos

### Pessoas (Leads)

- **Dados básicos**: Nome, título, empresa, localização
- **Perfil profissional**: Experiência, educação, habilidades
- **Dados de contato**: E-mail (descoberto), telefone, site, redes sociais
- **Atividades recentes**: Publicações, interações
- **Conexões**: Número de conexões, conexões em comum

### Empresas (Contas)

- **Dados básicos**: Nome, indústria, descrição, site, localização
- **Métricas**: Número de funcionários, crescimento, receita estimada
- **Funding**: Financiamentos, investidores, estágio
- **Pessoas-chave**: Executivos e funcionários importantes
- **Stack tecnológico**: Tecnologias utilizadas pela empresa

## 💡 Recursos Avançados

### Enriquecimento de Dados

O ator implementa múltiplas estratégias para descobrir e-mails e informações adicionais:

1. **Padrões de E-mail**: Testa padrões comuns de e-mail corporativo
2. **Pesquisa em Redes Sociais**: Busca em perfis sociais e sites pessoais
3. **Verificação de Existência**: Valida os e-mails descobertos
4. **Stack Tecnológico**: Identifica tecnologias usadas pela empresa

### Medidas de Segurança

Para evitar bloqueios e detecção, o ator implementa:

1. **Atrasos Aleatórios**: Evita padrões de tempo previsíveis
2. **Simulação de Comportamento Humano**: Movimentos de mouse, scrolls, cliques
3. **Headers Personalizados**: Evita assinaturas de automação
4. **Rotação de User-Agents**: Varia a identificação do navegador
5. **Gerenciamento de Sessões**: Mantém cookies e estado de sessão
6. **Técnicas Anti-Fingerprinting**: Dificulta a detecção do scraper

## 🔄 Integração API

O ator pode ser executado programaticamente via API do Apify:

```javascript
const Apify = require('apify');

// Inicializar cliente Apify
const client = new ApifyClient({
  token: 'SEU_TOKEN_APIFY',
});

// Executar o ator
const input = {
  searchUrl: 'https://www.linkedin.com/sales/search/people?query=...',
  searchType: 'people',
  cookies: '[Seus cookies]',
  maxItems: 100
};

// Iniciar a execução
const run = await client.actor('davidtamiette/linkedin-sales-navigator-scraper').call(input);

// Obter resultados
const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log('Total de itens extraídos:', items.length);
```

## 📈 Performance e Otimização

Este ator foi projetado com foco especial em performance e baixo consumo de recursos:

- **Priorização de Recursos**: Extrai dados críticos primeiro, garantindo valor mesmo com execuções parciais
- **Gerenciamento de Memória**: Otimizado para manter baixo uso de RAM mesmo com grandes volumes de dados
- **Retomada de Execução**: Permite continuar de onde parou em caso de interrupções
- **Paginação Inteligente**: Gerencia eficientemente a navegação entre páginas de resultados
- **Crawling Incremental**: Atualiza apenas dados novos ou modificados em execuções subsequentes

## 🔍 Diferencial Competitivo

Comparado a outros scrapers do LinkedIn Sales Navigator disponíveis no mercado:

1. **Descoberta de E-mails Superior**: Nossa implementação utiliza múltiplos métodos para encontrar e-mails válidos com alta taxa de sucesso
2. **Menor Consumo de Recursos**: Otimizado para usar menos CPU, memória e tempo de execução
3. **Resistência a Bloqueios**: Mecanismos avançados anti-detecção para evitar captchas e bloqueios
4. **Escalabilidade**: Capaz de processar grandes volumes de dados de forma eficiente
5. **Enriquecimento de Dados**: Agrega informações de diversas fontes para criar perfis mais completos

## 🚨 Limitações e Considerações

- Este ator requer cookies válidos de uma conta ativa do LinkedIn Sales Navigator
- O LinkedIn monitora ativamente comportamentos automatizados e pode limitar ou bloquear contas
- Recomendamos o uso de proxies residenciais para minimizar riscos de bloqueio
- Respeite os Termos de Serviço do LinkedIn e utilize os dados de acordo com a legislação de proteção de dados aplicável
- Configure atrasos adequados entre requisições para evitar sobrecarregar os servidores do LinkedIn

## 🛠️ Suporte e Manutenção

- **Atualizações Regulares**: O ator é mantido atualizado para acompanhar mudanças na interface do LinkedIn
- **Suporte Técnico**: Oferecemos suporte via GitHub Issues e e-mail
- **Personalização**: Entre em contato para soluções personalizadas ou funcionalidades específicas

## 📝 Licença

Este projeto está licenciado sob a licença MIT - consulte o arquivo [LICENSE](LICENSE) para obter detalhes.

## 👥 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📞 Contato

- **E-mail**: davidtamiette@hotmail.com
- **GitHub**: [davidtamiette](https://github.com/davidtamiette)
- **LinkedIn**: [David Tamiette](https://www.linkedin.com/in/david-tamiette)

---

Desenvolvido com ❤️ por David Tamiette, usando a plataforma [Apify](https://apify.com).