import { defineConfig } from 'eslint/config';
import { configs } from '@croct/eslint-plugin';

export default defineConfig(
    configs.typescript.map(config => ({
        ...config,
        files: config.files ?? ['**/*.ts', '**/*.tsx'],
        ...(config.languageOptions === undefined
            ? {}
            : {languageOptions: {
                ...config.languageOptions,
                parserOptions: {
                    ...config.languageOptions.parserOptions,
                    projectService: config.languageOptions.parserOptions?.projectService === true
                        ? {allowDefaultProject: ['*.config.ts']}
                        : config.languageOptions.parserOptions?.projectService,
                },
            }}),
    })),
    {
        files: ['src/**/*.ts'],
        rules: {
            'import-x/extensions': 'off',
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'CallExpression[arguments.length=0] '
                        + "> MemberExpression[object.name='Instant'][property.name='now']",
                    message: 'Do not use Instant.now without a clock.',
                },
                {
                    selector: 'CallExpression[arguments.length=0] '
                        + "> MemberExpression[object.name='LocalDateTime'][property.name='now']",
                    message: 'Do not use LocalDateTime.now without a clock.',
                },
                {
                    selector: 'CallExpression[arguments.length=1] '
                        + "> MemberExpression[object.name='LocalDateTime'][property.name='nowIn']",
                    message: 'Do not use LocalDateTime.nowIn without a clock.',
                },
                {
                    selector: 'CallExpression[arguments.length=0] '
                        + "> MemberExpression[object.name='Date'][property.name='now']",
                    message: 'Do not use Date.now, use a clock.',
                },
                {
                    selector: "NewExpression[callee.name='Date']",
                    message: 'Do not create a Date instance, use a clock.',
                },
            ],
            '@typescript-eslint/unbound-method': 'off',
        },
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "CallExpression[callee.object.name='jest'][callee.property.name='spyOn'] "
                        + "> Identifier[name='Instant'] ~ Literal[value='now']",
                    message: 'Do not mock Instant.now, use a FixedClock.',
                },
                {
                    selector: "CallExpression[callee.object.name='jest'][callee.property.name='spyOn'] "
                        + "> Identifier[name='LocalDateTime'] ~ Literal[value='now']",
                    message: 'Do not mock LocalDateTime.now, use a FixedClock.',
                },
            ],
        },
    },
    {
        files: ['tsup.config.ts'],
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            'import-x/no-default-export': 'off',
        },
    }
);
