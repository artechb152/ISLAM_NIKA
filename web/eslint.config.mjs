/* The lint gate.
 *
 * `npm run lint` sat in package.json for months and never checked a line:
 * ESLint was not installed and there was no config, so the command exited 1
 * without reading any source — a gate that only looked like one.
 *
 * The rules are Next's own set. What is tuned below is tuned for a reason, and
 * each reason is written down, because the failure mode of a fresh config on a
 * mature codebase is 71 errors on correct code, which teaches everyone to run
 * lint with their eyes shut. That is worse than not running it.
 */
import next from 'eslint-config-next'

export default [
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'next-env.d.ts',
      /* Live-lab output and one-off experiments — regenerated, never shipped. */
      'scratchpad/**',
      /* Layout snapshots kept beside the live files so a bad dressing pass can
         be walked back. They are data, not code, but the globs below would pull
         any stray .ts in with them. */
      'src/lib/chapter1/_backup-*/**',
    ],
  },

  ...next,

  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      /* The React Compiler rules that ship with eslint-plugin-react-hooks v6
         assume a component tree that only describes the DOM. Half this codebase
         is imperative three.js: `scene.background = tex` inside an effect is not
         a mistake, it is the entire purpose of that effect — synchronising React
         with an external system. Seeded-once randomness inside useMemo, and refs
         read on the imperative path, are the same story.
         Together they fired 45 times on Game.tsx alone, all on code that is
         doing exactly what r3f asks for. They stay on, because outside the
         canvas they catch real cascading-render bugs and the warnings are worth
         reading — but they do not fail the build over a correct scene graph. */
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',

      /* The chapter is written in Hebrew, where the apostrophe is a letter
         modifier and not a quotation mark: עֻמַר בן אלח'טאב, הח'ליף, ג'אהליה.
         The rule reads those as unclosed JSX quotes and wants &apos; in the
         middle of a word. Hebrew quotation uses „ " and neither is on the
         list, so what stays forbidden is what is genuinely ambiguous in
         markup — a stray angle or curly bracket. */
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],

      /* An unused argument is often a signature the API dictates — a three.js
         callback's (state, delta) where only delta is wanted. Names starting
         with _ are the existing convention here for "required, unused".

         It has to be the TypeScript-aware rule: the base one cannot tell a
         value from a type, so it reads the parameter names inside a declared
         function type — `onDrop: (id: string) => void` — as unused variables.
         Turned on plain, it invented 30 errors in types.ts and usePickPlace.ts
         alone, none of them about code that runs. */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  {
    /* The build and check scripts are Node ESM, not browser React. They are the
       gates themselves, so they are linted — but against Node's globals. */
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
]
