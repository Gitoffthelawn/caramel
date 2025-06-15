export const isValidUrl = (str) => {
    try {
        const raw = value.trim();
        const url = /^(https?:)?\/\//i.test(raw)
            ? new URL(raw)
            : new URL(`https://${raw}`);
        return url.hostname.includes("."); // must have a dot
    } catch {
        return false;
    }
};