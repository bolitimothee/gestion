const isDev = import.meta.env && import.meta.env.MODE === 'development';

export const debug = (...args) => {
  if (isDev) console.debug(...args);
};

export const info = (...args) => {
  if (isDev) console.info(...args);
};

export const warn = (...args) => {
  console.warn(...args);
};

export const error = (...args) => {
  console.error(...args);
};

export default { debug, info, warn, error };
