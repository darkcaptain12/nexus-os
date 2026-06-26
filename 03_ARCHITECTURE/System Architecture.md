# System Architecture

```mermaid
graph TD
User-->Web
User-->Mobile
Web-->API
Mobile-->API
API-->Queue
Queue-->AI
Queue-->Automation
AI-->Supabase
Automation-->DesktopAgent
Automation-->BrowserExtension
```
