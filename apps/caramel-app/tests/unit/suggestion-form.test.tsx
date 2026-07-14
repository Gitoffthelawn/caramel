// @vitest-environment jsdom
import SuggestionForm from '@/components/supported-site/suggestion-form'
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// NF-05 — the form previously had NO editable input and never called setUrl,
// so it could only ever submit its `initialValue` verbatim. These pins prove
// it is now a real controlled form: the input reflects `initialValue`, the
// user can edit it, and submitting posts the EDITED url to /api/sites/suggest
// then fires the existing `resetValue` handler. (Red before the fix — the
// input the first pin queries did not exist.)
const { toastMock } = vi.hoisted(() => ({
    toastMock: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: toastMock }))

beforeEach(() => {
    toastMock.success.mockClear()
    toastMock.warning.mockClear()
    toastMock.error.mockClear()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe('SuggestionForm (NF-05)', () => {
    it('renders an editable input pre-filled with initialValue', () => {
        render(
            <SuggestionForm
                initialValue="https://initial.example.com"
                resetValue={vi.fn()}
            />,
        )
        const input = screen.getByPlaceholderText(
            'https://example.com',
        ) as HTMLInputElement
        expect(input.value).toBe('https://initial.example.com')
    })

    it('submits the EDITED value (not initialValue) and fires resetValue', async () => {
        const resetValue = vi.fn()
        render(
            <SuggestionForm
                initialValue="https://initial.example.com"
                resetValue={resetValue}
            />,
        )
        const input = screen.getByPlaceholderText('https://example.com')
        fireEvent.change(input, {
            target: { value: 'https://edited.example.com' },
        })
        fireEvent.submit(input.closest('form') as HTMLFormElement)

        await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
        const [calledUrl, options] = (fetch as ReturnType<typeof vi.fn>).mock
            .calls[0] as [string, RequestInit]
        expect(calledUrl).toBe('/api/sites/suggest')
        expect(JSON.parse(options.body as string)).toEqual({
            url: 'https://edited.example.com',
        })
        await waitFor(() => expect(resetValue).toHaveBeenCalledTimes(1))
    })
})
