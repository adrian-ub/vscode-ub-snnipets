---
prefixes:
  - ima
scopes:
  - javascript
  - typescript
  - javascriptreact
  - typescriptreact
  - vue
---

```
import { ${2:originalName} as ${3:alias} } from '${1:module}'$0
```

---

imports only a portion of the module as alias `import { rename as localRename } from 'fs'`
