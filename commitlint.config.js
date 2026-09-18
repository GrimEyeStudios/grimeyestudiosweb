/** Conventional Commits enforcement (feat/fix/docs/chore/ci/...). */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      ['art', 'games', 'apps', 'about', 'ui', 'ci', 'deps', 'repo', 'docs'],
    ],
  },
};
