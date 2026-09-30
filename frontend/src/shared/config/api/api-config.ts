const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const apiBaseUrl = (configuredUrl
  || (import.meta.env.DEV ? '/api' : 'https://d5dopqqib47kpsh6929m.jki8ffxa.apigw.yandexcloud.net')).replace(/\/+$/, '');
