import { useState, useCallback } from 'react';

const KEY = 'pd_api_token';

export function useToken() {
  const [token, setTokenState] = useState<string>(() => localStorage.getItem(KEY) ?? '');

  const setToken = useCallback((t: string) => {
    localStorage.setItem(KEY, t);
    setTokenState(t);
  }, []);

  const clearToken = useCallback(() => {
    localStorage.removeItem(KEY);
    setTokenState('');
  }, []);

  return { token, setToken, clearToken };
}
