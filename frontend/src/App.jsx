import "./App.css";

import { useEffect, useRef, useState } from "react";

import backgroundImage from "./assets/yorumiya-room.png";

import akariImage from "./assets/characters/yorumiya-akari-base.png";

function App() {
  const [comment, setComment] = useState("");

  const [subtitle, setSubtitle] = useState("こんばんは、静かな夜ですね。");

  const [comments, setComments] = useState([]);

  const [isTyping, setIsTyping] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  const commentListRef = useRef(null);

  // =========================
  // 時計更新
  // =========================

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // =========================
  // コメント自動スクロール
  // =========================

  useEffect(() => {
    if (!commentListRef.current) {
      return;
    }

    commentListRef.current.scrollTop = commentListRef.current.scrollHeight;
  }, [comments]);

  // =========================
  // タイプ演出
  // =========================

  async function typeSubtitle(text) {
    setSubtitle("");

    for (let i = 0; i < text.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));

      setSubtitle((prev) => prev + text[i]);
    }
  }

  // =========================
  // コメント送信
  // =========================

  async function handleSubmit() {
    if (!comment.trim()) {
      return;
    }

    const userComment = comment;

    setComment("");

    // =========================
    // コメント履歴追加
    // =========================

    setComments((prev) => [
      ...prev,

      {
        user: "galpachi",

        text: userComment,
      },
    ]);

    try {
      // =========================
      // thinking開始
      // =========================

      setSubtitle("");

      setIsTyping(true);

      const response = await fetch(
        "http://127.0.0.1:3000/api/chat",

        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            message: userComment,
          }),
        },
      );

      const data = await response.json();

      // =========================
      // typing終了
      // =========================

      setIsTyping(false);

      // =========================
      // タイプ演出表示
      // =========================

      await typeSubtitle(data.reply);
    } catch (error) {
      console.log(error);

      setIsTyping(false);

      setSubtitle("通信エラー");
    }
  }

  // =========================
  // 時計表示
  // =========================

  const dateText = currentTime.toLocaleDateString(
    "ja-JP",

    {
      year: "numeric",

      month: "2-digit",

      day: "2-digit",

      weekday: "short",
    },
  );

  const timeText = currentTime.toLocaleTimeString(
    "ja-JP",

    {
      hour: "2-digit",

      minute: "2-digit",
    },
  );

  return (
    <div className="app">
      <img className="background" src={backgroundImage} alt="background" />

      {/* =========================
          立ち絵
      ========================= */}

      <img className="akari-character" src={akariImage} alt="夜宮 灯" />

      {/* =========================
          時計
      ========================= */}

      <div className="clock-container">
        <div className="clock-date">{dateText}</div>

        <div className="clock-time">{timeText}</div>
      </div>

      {/* =========================
          字幕
      ========================= */}

      <div className="subtitle-container">
        <div className="subtitle-name">夜宮 灯</div>

        <div className="subtitle-text">
          {isTyping ? (
            <div className="thinking">
              ...考え中
              <span className="typing-dot">▋</span>
            </div>
          ) : (
            subtitle
          )}
        </div>
      </div>

      {/* =========================
          コメント履歴
      ========================= */}

      <div className="comment-list" ref={commentListRef}>
        {comments.map((item, index) => (
          <div key={index} className="comment-item">
            <div className="comment-user">{item.user}</div>

            <div className="comment-text">{item.text}</div>
          </div>
        ))}
      </div>

      {/* =========================
          コメント入力
      ========================= */}

      <div className="comment-input-container">
        <input
          className="comment-input"
          type="text"
          placeholder="コメントを入力..."
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSubmit();
            }
          }}
        />
      </div>
    </div>
  );
}

export default App;
