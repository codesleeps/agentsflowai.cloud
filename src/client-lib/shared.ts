import axios from "axios";

const vybeDomain = process.env.NEXT_PUBLIC_VYBE_INTEGRATIONS_DOMAIN ?? "https://vybe.build";
const showLiveData = process.env.NEXT_PUBLIC_SHOW_LIVE_DATA === "true";
export const showFakeData = process.env.NODE_ENV === "development" && !showLiveData;

export const integrationsClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

export const fetcher = <T>(url: string) => integrationsClient.get<T>(url).then((res) => res.data);

export const poster = <T>(url: string, data?: any) => integrationsClient.post<T>(url, data).then((res) => res.data);
