import { decryptJsonClient } from './cryptoHelpers'

export function decryptJsonData(resData: any): any {
    // Raw process.env read (not the `clientEnv` singleton in
    // src/lib/env.client.ts): tests/unit/decryptJsonData.test.ts exercises
    // this per-call via vi.stubEnv, which mutates process.env live;
    // clientEnv is parsed once at import time and wouldn't observe
    // per-test stubs. NEXT_PUBLIC_API_ENCRYPTION_ENABLED is still declared
    // in that schema (documented in .env.example / covered by the drift
    // check) — only this call site's read stays dynamic.
    //
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
