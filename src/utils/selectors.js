/**
 * Seletores para extração de dados do LinkedIn Sales Navigator
 * 
 * Este módulo define todos os seletores CSS e XPath utilizados para
 * localizar e extrair elementos de diferentes páginas do LinkedIn Sales Navigator.
 * 
 * Os seletores são mantidos centralizados neste arquivo para facilitar
 * a manutenção quando o LinkedIn atualiza sua interface.
 */

module.exports = {
    // Seletores para páginas de login e autenticação
    auth: {
        loginForm: 'form.login__form',
        emailInput: '#username',
        passwordInput: '#password',
        submitButton: '.login__form_action_container button',
        errorMessage: '.alert-content',
        rememberMeCheckbox: '#remember-me',
        captchaContainer: '.captcha-container',
        verificationContainer: '.verification-container'
    },
    
    // Seletores para navegação geral
    navigation: {
        searchBar: '.global-nav__search',
        searchInput: '.global-nav__search-typeahead-input',
        salesNavMenu: '.global-nav__sales-nav',
        userMenu: '.global-nav__me',
        logoutButton: 'a[href*="logout"]',
        profileMenu: '.profile-rail-card__profile-info',
        notificationsIcon: '.global-nav__notifications',
        messagesIcon: '.global-nav__messaging',
        homeLink: 'a[href="/sales/homepage"]',
        leadsLink: 'a[href*="/sales/lists/people"]',
        accountsLink: 'a[href*="/sales/lists/company"]',
        paginationNext: 'button.artdeco-pagination__button--next',
        paginationPrev: 'button.artdeco-pagination__button--previous',
        paginationPages: '.artdeco-pagination__pages button',
        currentPage: '.artdeco-pagination__pages .selected'
    },
    
    // Seletores para páginas de pessoas (leads)
    people: {
        // Seletores para páginas de resultados de pesquisa de pessoas
        searchResults: {
            container: 'section.search-results__container',
            itemContainer: 'li.search-results__result-item',
            profileLink: 'a.search-results__result-link',
            name: '.result-lockup__name',
            title: '.result-lockup__highlight-keyword',
            location: '.result-lockup__misc-item',
            company: '.result-lockup__position-company',
            profileImage: '.presence-entity__image',
            connectedIndicator: '.result-lockup__badge-icon--connected',
            sharedConnections: '.result-lockup__badge-text',
            saveButton: 'button[aria-label*="Save"]',
            connectButton: 'button[aria-label*="Connect"]',
            viewProfileButton: 'button[aria-label*="View"]',
            resultCount: '.search-results__pagination-hint'
        },
        
        // Seletores para páginas de perfil de pessoas
        profile: {
            container: '.profile-topcard',
            basic: {
                name: '.profile-topcard__title',
                title: '.profile-topcard__subtitle',
                location: '.profile-topcard__location-data',
                company: '.profile-topcard__current-positions .profile-topcard__summary-position-title a',
                about: '.profile-topcard__summary-content',
                profileImage: '.profile-topcard__image',
                connectionsCount: '.profile-topcard__connections-data'
            },
            experience: {
                container: '.profile-experience__position',
                title: '.profile-experience__position-title',
                company: '.profile-experience__position-company',
                dateRange: '.profile-experience__date-range',
                location: '.profile-experience__location',
                description: '.profile-experience__position-description'
            },
            education: {
                container: '.profile-education__school',
                school: '.profile-education__school-name',
                degree: '.profile-education__degree',
                field: '.profile-education__field',
                dateRange: '.profile-education__date-range'
            },
            skills: {
                container: '.profile-skills',
                skillItem: '.profile-skills__skill',
                showMore: '.profile-skills__show-more-button'
            },
            additional: {
                email: '.profile-contact-info__contact-type-email .profile-contact-info__contact-value',
                phone: '.profile-contact-info__contact-type-phone .profile-contact-info__contact-value',
                website: '.profile-contact-info__contact-type-website .profile-contact-info__contact-value a',
                twitter: '.profile-contact-info__contact-type-twitter .profile-contact-info__contact-value a',
                facebook: '.profile-contact-info__contact-type-facebook .profile-contact-info__contact-value a',
                birthday: '.profile-contact-info__contact-type-birthday .profile-contact-info__contact-value',
                languages: '.profile-languages__list',
                connections: '.profile-topcard__connections-data'
            },
            activityTab: '.profile-activity__tab',
            activity: {
                activityItems: '.profile-activity-section__activity-card',
                activityType: '.profile-activity-section__activity-type',
                activityContent: '.profile-activity-section__activity-body',
                activityDate: '.profile-activity-section__activity-date',
                activityLink: '.profile-activity-section__activity-link'
            },
            similarLeads: {
                container: '.similar-profiles',
                item: '.similar-profiles__item',
                name: '.similar-profiles__name',
                title: '.similar-profiles__title',
                company: '.similar-profiles__company'
            }
        }
    },
    
    // Seletores para páginas de empresas (contas)
    companies: {
        // Seletores para páginas de resultados de pesquisa de empresas
        searchResults: {
            container: 'section.search-results__container',
            itemContainer: 'li.search-results__result-item',
            profileLink: 'a.search-results__result-link',
            name: '.result-lockup__name',
            industry: '.result-lockup__highlight-keyword',
            location: '.result-lockup__misc-item',
            description: '.result-description',
            employeeCount: '.result-lockup__misc-item',
            logo: '.result-lockup__icon',
            saveButton: 'button[aria-label*="Save"]',
            viewProfileButton: 'button[aria-label*="View"]',
            resultCount: '.search-results__pagination-hint'
        },
        
        // Seletores para páginas de perfil de empresas
        profile: {
            container: '.account-topcard',
            basic: {
                name: '.account-topcard__name',
                industry: '.account-topcard__industry',
                location: '.account-topcard__location',
                website: '.account-topcard__website a',
                description: '.account-topcard__description',
                logo: '.account-topcard__logo',
                founded: '.account-topcard__founded-data',
                companyType: '.account-topcard__company-type',
                specialties: '.account-topcard__specialities-data'
            },
            employees: {
                count: '.account-employees-stats__count',
                growth: '.account-employees-stats__growth',
                distribution: '.account-employees-stats__distribution-list'
            },
            metrics: {
                revenue: '.account-metrics__revenue',
                totalFunding: '.account-metrics__funding-total',
                latestFunding: '.account-metrics__funding-latest',
                valuation: '.account-metrics__valuation',
                growthRate: '.account-metrics__growth-rate',
                followers: '.account-metrics__followers'
            },
            financial: {
                totalFunding: '.account-funding__total',
                latestRound: '.account-funding__latest-round',
                investors: '.account-funding__investors',
                ipoStatus: '.account-funding__ipo-status',
                fundingRoundsContainer: '.account-funding__rounds-container',
                fundingRoundItem: '.account-funding__round',
                roundDate: '.account-funding__round-date',
                roundType: '.account-funding__round-type',
                roundAmount: '.account-funding__round-amount',
                roundInvestors: '.account-funding__round-investors'
            },
            keyPeopleTab: '.account-tabs__employees-tab',
            keyPeople: {
                keyPeopleList: '.account-employees-list',
                keyPeopleItem: '.account-employees-list__item',
                keyPeopleName: '.account-employees-list__name',
                keyPeopleTitle: '.account-employees-list__title',
                keyPeopleLink: '.account-employees-list__link',
                keyPeopleImage: '.account-employees-list__image'
            },
            techTab: '.account-tabs__tech-tab',
            tech: {
                techList: '.account-tech-list',
                techItem: '.account-tech-list__item',
                techCategory: '.account-tech-list__category',
                techName: '.account-tech-list__name'
            },
            similarAccounts: {
                container: '.similar-accounts',
                item: '.similar-accounts__item',
                name: '.similar-accounts__name',
                industry: '.similar-accounts__industry',
                logo: '.similar-accounts__logo'
            }
        }
    },
    
    // Seletores para filtros de pesquisa
    searchFilters: {
        container: '.search-filter-panel',
        filterGroup: '.search-filter__group',
        filterTitle: '.search-filter__title',
        checkbox: '.search-filter__checkbox',
        valueInput: '.search-filter__value-input',
        rangeInput: '.search-filter__range-input',
        locationInput: '.search-filter__location-input',
        keywordInput: '.search-filter__keyword-input',
        saveFiltersButton: '.search-filter__save-button',
        clearFiltersButton: '.search-filter__clear-button',
        applyFiltersButton: '.search-filter__apply-button',
        savedSearchDropdown: '.saved-search-dropdown',
        savedSearchItem: '.saved-search-dropdown__item'
    },
    
    // Seletores para mensagens de erro e status
    status: {
        noResults: '.search-results__no-results',
        errorContainer: '.error-container',
        loadingSpinner: '.artdeco-spinner',
        captchaChallenge: '.captcha-challenge',
        searchLoading: '.search-results__progress-bar',
        profileLoading: '.profile-loading',
        networkError: '.network-error',
        serverError: '.server-error'
    }
};