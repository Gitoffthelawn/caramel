import { decryptJsonClient } from './cryptoHelpers'

export function decryptJsonData(resData: any): any {
    // If encryption is not enabled, return raw response
    if (process.env.NEXT_PUBLIC_API_ENCRYPTION_ENABLED !== 'true') {
        return resData?.pageData || resData?.response || resData
    }

    // If encryption is enabled but no 'response' or 'encryptPageData' key is found, return raw response
    if (!resData?.response && !resData?.pageData) {
        return resData
    }

    try {
        if (resData.pageData) {
            return decryptJsonClient(resData.pageData)
        } else {
            return decryptJsonClient(resData.response)
        }
    } catch (err) {
        return resData
    }
}
