# PluginContext.Clipboard
Clipboard API
* **readText(type): Promise&lt;String&gt;**
  - `type` String (optional)
  
* **writeText(text, type)**
  - `text` String
  - `type` String (optional)

* **readHTML(type): Promise&lt;String&gt;**
  - `type` String (optional)

* **writeHTML(html, type)**
  - `html` String
  - `type` String (optional)
  
* **clear(type)**
  - `type` String (optional)

> **Note:** readText, readHTML returns Promise! 

See [Electron Documentation for clipboard](http://electron.atom.io/docs/api/clipboard/) for details

**Example**
```javascript
'use strict'

module.exports = (pluginContext) => {
  const clipboard = pluginContext.clipboard;
  
  function startup() { ... }
  function search(query, res) { ... }
  
  function execute(id, payload) {
    clipboard.readText().then((result) => {
      console.log('Text from clipboard: ' + result);
    });
  }
  
  return { startup, search, execute };
};
```

## Related Docs
* [PluginContext](plugin-context.md)

