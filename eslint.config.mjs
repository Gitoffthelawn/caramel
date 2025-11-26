import next from 'eslint-config-next'

export default [
    ...next,
    {
        rules: {
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/immutability': 'off',
            'no-console': 'off',
            'import/no-anonymous-default-export': 'off',
            '@next/next/no-img-element': 'off',
            'react/no-unescaped-entities': 'off',
        },
    },
]
