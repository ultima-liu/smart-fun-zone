# 本地书写笔顺

95 个实际书写字的数据来自 Hanzi Writer Data：

- 原有 76 个字取自 https://github.com/chanind/hanzi-writer-data/tree/master/data ，下载于 2026-10-06。
- 2026-10-11 补充园地认写所需的 18 个字：六、七、八、十、女、开、关、先、工、厂、门、卫、爸、妈、牛、羊、爪、白。取自 npm hanzi-writer-data@2.0.1，由 https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/ 提供。

- 2026-10-11 按用户要求另增加园地一补练的“九”，来源同为 hanzi-writer-data@2.0.1。

JSON 内容未改动，保留原数据提供的 ARPHIC PUBLIC LICENSE，见 LICENSE。运行时读取本地文件。

数据用于 Hanzi Writer 的范写动画和屏幕逐笔书写检查。范字观察不算实际书写；按顺序写完全部笔画才记录本次任务通过，不等同于证明脱离屏幕提示的纸笔书写能力。资源加载异常可重试，尚未记录完成。
