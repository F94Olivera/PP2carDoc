export const listPageSizeOptions = [5, 10, 20, 30, 50] as const;
export const defaultListPageSize = 10;

const listPageSizeStorageKey = "cardoc:list-page-size";

export const getStoredListPageSize = () => {
  if (typeof window === "undefined") {
    return defaultListPageSize;
  }

  const storedPageSize = Number(window.localStorage.getItem(listPageSizeStorageKey));

  return listPageSizeOptions.includes(storedPageSize as (typeof listPageSizeOptions)[number])
    ? storedPageSize
    : defaultListPageSize;
};

export const storeListPageSize = (pageSize: number) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!listPageSizeOptions.includes(pageSize as (typeof listPageSizeOptions)[number])) {
    return;
  }

  window.localStorage.setItem(listPageSizeStorageKey, String(pageSize));
};
