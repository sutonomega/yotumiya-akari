# 夜宮 灯 / Yorumiya Akari

静かな会話と長期記憶を持つ、ローカル人格AIプロジェクト。

Discord Botとして動作し、
ユーザーとの会話・自発発言・定時つぶやきなどを行います。

---

## 特徴

- ローカルLLMで動作
- 長期記憶機能
- 自発発言
- 定時つぶやき
- 静かな夜の空気感を重視した会話
- 軽量構成を意識した設計
- function分離によるモジュール構成

---

## 使用技術

- Node.js
- Discord.js
- Ollama
- qwen2.5:3b

---

## 現在の機能

### 会話

ユーザーとの自然な会話を行います。

### 長期記憶

会話から重要な内容を抽出し、
long_memory.txtへ保存します。

### 自発発言

一定時間会話がない場合、
自然に話しかけます。

### 定時つぶやき

時間帯に合わせた静かなつぶやきを投稿します。

---

## ディレクトリ構成

```txt
functions/
├ generateMessage.js
├ getCurrentState.js
├ loadJson.js
├ processHistory.js
├ saveHistory.js
├ saveMood.js
├ savePostCandidate.js
├ saveTalkStats.js
├ updateMood.js
└ updateTalkStats.js
```

---

## 今後やりたいこと

- 長期記憶の再要約
- ログシステム整理
- WebUI
- 発話queue制御
- モデル切り替え強化
- memory整理最適化

---

## 注意

.env や memory フォルダ内の個人データは
GitHubへアップロードしないでください。
