import { useEffect, useRef, useState } from 'react';

export const useDebounce = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const useDebouncedCallback = (fn, delay = 300) => {
  const fnRef = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  return (...args) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delay);
  };
};
