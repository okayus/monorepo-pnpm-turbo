# Configuration Files

> **Note**
>
> ESLint is transitioning to a new configuration system. This new system is the default and is what is described on this page. If you are still using the old configuration system (using `.eslintrc.js`), please refer to the [Configuration Files (deprecated)](/docs/latest/use/configure/configuration-files-deprecated) documentation.

ESLint has a flexible configuration system that lets you specify the linting rules for your project. You can configure rules, plugins, extensions, and more.

## `eslint.config.js`

The `eslint.config.js` file is the main configuration file for ESLint. It is a JavaScript file that exports an array of configuration objects. ESLint uses this file to lint your project.

Here is an example of an `eslint.config.js` file:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      "no-unused-vars": "error",
      "no-undef": "error"
    }
  }
];
```

In this example, the configuration array contains a single object that enables the `no-unused-vars` and `no-undef` rules.

### Configuration Objects

Each configuration object in the `eslint.config.js` file can contain the following properties:

*   `files`: An array of glob patterns that specify the files to which the configuration object applies. If not specified, the configuration object applies to all files.
*   `ignores`: An array of glob patterns that specify the files to ignore.
*   `languageOptions`: An object that contains settings related to how JavaScript is linted.
*   `linterOptions`: An object that contains settings related to the linting process.
*   `plugins`: An object that contains plugins.
*   `processor`: The name of a processor or a processor object.
*   `rules`: An object that contains the rules to enable.
*   `settings`: An object that contains shared settings.

### `files`

The `files` property is an array of glob patterns that specify the files to which the configuration object applies. For example, to apply a configuration to all files in the `src` directory, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    files: ["src/**/*.js"],
    rules: {
      "no-unused-vars": "error"
    }
  }
];
```

### `ignores`

The `ignores` property is an array of glob patterns that specify the files to ignore. For example, to ignore all files in the `dist` directory, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    ignores: ["dist/**/*.js"]
  }
];
```

### `languageOptions`

The `languageOptions` property is an object that contains settings related to how JavaScript is linted. It can contain the following properties:

*   `ecmaVersion`: The ECMAScript version to use.
*   `sourceType`: The source type to use.
*   `globals`: An object that contains the global variables to recognize.
*   `parser`: The parser to use.
*   `parserOptions`: An object that contains the parser options.

### `linterOptions`

The `linterOptions` property is an object that contains settings related to the linting process. It can contain the following properties:

*   `noInlineConfig`: A boolean that indicates whether to disable inline configuration comments.
*   `reportUnusedDisableDirectives`: A boolean that indicates whether to report unused `eslint-disable` directives.

### `plugins`

The `plugins` property is an object that contains plugins. The keys are the plugin names and the values are the plugin objects. For example, to use the `react` plugin, you would use the following:

```javascript
// eslint.config.js
import react from "eslint-plugin-react";

export default [
  {
    files: ["src/**/*.js"],
    plugins: {
      react: react
    },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error"
    }
  }
];
```

### `processor`

The `processor` property is the name of a processor or a processor object. For example, to use the `markdown` processor from the `eslint-plugin-markdown` plugin, you would use the following:

```javascript
// eslint.config.js
import markdown from "eslint-plugin-markdown";

export default [
  {
    files: ["**/*.md"],
    processor: markdown.processors.markdown
  }
];
```

### `rules`

The `rules` property is an object that contains the rules to enable. The keys are the rule names and the values are the rule settings. For example, to enable the `no-unused-vars` rule, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      "no-unused-vars": "error"
    }
  }
];
```

### `settings`

The `settings` property is an object that contains shared settings. The settings are available to all rules. For example, to share a `react` version setting with all rules, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
```

## Configuration File Resolution

When ESLint is run, it looks for an `eslint.config.js` file in the current working directory. If it finds one, it uses it. If not, it searches up the directory tree for an `eslint.config.js` file. This allows you to have different configuration files for different parts of your project.

You can also specify a configuration file on the command line using the `--config` flag.

## Sharing Configurations

You can share configurations by publishing them as npm packages. To use a shared configuration, you can import it in your `eslint.config.js` file. For example, to use the `eslint-config-standard` shared configuration, you would first install it:

```
npm install eslint-config-standard --save-dev
```

Then, you would import it in your `eslint.config.js` file:

```javascript
// eslint.config.js
import standard from "eslint-config-standard";

export default [
  standard
];
```

## Configuring Rules

You can configure rules in the `rules` property of a configuration object. The keys are the rule names and the values are the rule settings. The rule setting can be one of the following:

*   `"off"` or `0`: Disables the rule.
*   `"warn"` or `1`: Enables the rule as a warning.
*   `"error"` or `2`: Enables the rule as an error.

Some rules have additional options that you can specify. The options are an array that follows the rule setting. For example, to configure the `quotes` rule to require single quotes, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      "quotes": ["error", "single"]
    }
  }
];
```

## Configuring Plugins

You can configure plugins in the `plugins` property of a configuration object. The keys are the plugin names and the values are the plugin objects. For example, to use the `react` plugin, you would use the following:

```javascript
// eslint.config.js
import react from "eslint-plugin-react";

export default [
  {
    files: ["src/**/*.js"],
    plugins: {
      react: react
    },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error"
    }
  }
];
```

## Configuring a Parser

You can configure a parser in the `languageOptions` property of a configuration object. For example, to use the `@typescript-eslint/parser`, you would use the following:

```javascript
// eslint.config.js
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: typescriptParser
    }
  }
];
```

## Specifying Globals

You can specify global variables in the `languageOptions.globals` property of a configuration object. The keys are the global variable names and the values are `"writable"` to allow the variable to be overwritten or `"readonly"` to disallow overwriting. For example, to specify the `$` and `jQuery` global variables, you would use the following:

```javascript
// eslint.config.js
export default [
  {
    languageOptions: {
      globals: {
        "$": "readonly",
        "jQuery": "readonly"
      }
    }
  }
];
```

## Using `eslint-env`

You can also specify environments using the `eslint-env` comment in a file. For example, to specify the `browser` and `node` environments, you would add the following comment to the top of your file:

```javascript
/* eslint-env browser, node */
```

## Disabling Rules with Inline Comments

You can disable rules with inline comments. To disable all rules on a specific line, use the following comment:

```javascript
// eslint-disable-next-line
```

To disable a specific rule on a specific line, use the following comment:

```javascript
// eslint-disable-next-line no-unused-vars
```

To disable all rules for a block of code, use the following comments:

```javascript
/* eslint-disable */

// code to ignore

/* eslint-enable */
```

To disable a specific rule for a block of code, use the following comments:

```javascript
/* eslint-disable no-unused-vars */

// code to ignore

/* eslint-enable no-unused-vars */
```

## Further Reading

*   [Command Line Interface](/docs/latest/use/command-line-interface)
*   [Integrations](/docs/latest/use/integrations)
*   [Rules](/docs/latest/rules/)
*   [Plugins](/docs/latest/use/plugins)
*   [Shareable Configs](/docs/latest/use/shareable-configs)
