/**
 * 打字同步驱动器：让朗读进度跟随打字进度。
 *
 * 纯 ESM，不依赖 React，不依赖 DOM。tts 由外部注入（可以是假实现），因此本层
 * 只负责「策略」，不碰任何浏览器 API。
 *
 * 同步策略（契约 2.4）：
 *   1. 一次只读一个词：学习者正在打的是哪个词，机器就只读哪个词。
 *      整句一起读，机器会跑在前面，学习者听到的已经不是自己正在写的那一句；
 *      逐词读才是「听到 → 跟着写」的那个节奏。
 *   2. 学习者换词时，换掉当前这个词的朗读，从新词重新读。
 *   3. 同一个词不重复读；学习者想再听一遍，由 repeat() 明确要求。
 *   4. setWords 一律先 stop 内部状态。
 *
 * @typedef {{ speak: Function, cancel?: Function, pause?: Function, resume?: Function }} TtsController
 */

/**
 * 打字同步驱动器：让朗读进度跟随打字进度。
 *
 * @param {{ tts: TtsController, onWordSpoken?: (index: number) => void }} options
 * @returns {SyncDriver}
 */
export function createSyncDriver(options) {
  const opts = options && typeof options === 'object' ? options : {};
  const tts = opts.tts || null;
  const onWordSpoken = typeof opts.onWordSpoken === 'function' ? opts.onWordSpoken : null;

  /** @type {string[]} */
  let words = [];
  let spokenIndex = -1; // 正在读（或刚读完）的词下标
  let playing = false;
  let generation = 0; // 会话令牌：cancel 之后旧回调失效

  /**
   * 停止并复位（保留当前词表）。
   */
  function stop() {
    generation += 1;
    if (tts && typeof tts.cancel === 'function') {
      try {
        tts.cancel();
      } catch {
        // 忽略
      }
    }
    playing = false;
    spokenIndex = -1;
  }

  /**
   * 读出第 index 个词。只有这一个词。
   *
   * @param {number} index
   */
  function speakWord(index) {
    if (!tts || typeof tts.speak !== 'function') return;
    const word = words[index];
    if (typeof word !== 'string' || word.trim() === '') return;
    spokenIndex = index;
    playing = true;
    const myGen = ++generation;

    tts.speak(word, {
      onWord: () => {
        if (myGen !== generation) return;
        if (onWordSpoken) onWordSpoken(index);
      },
      onEnd: () => {
        if (myGen !== generation) return;
        playing = false;
      },
      onError: () => {
        if (myGen !== generation) return;
        playing = false;
      },
    });
  }

  /**
   * 设置当前句子的词数组（纯文本）。调用时先复位内部状态。
   *
   * `keepSpeech` 说这次换词不是要打断朗读：朗读属于连续朗读，同步器只把
   * 自己的状态复位，不去碰别人的声音。
   *
   * @param {string[]} nextWords
   * @param {{ keepSpeech?: boolean }} [options]
   */
  function setWords(nextWords, options = {}) {
    generation += 1;
    playing = false;
    spokenIndex = -1;
    if (!options.keepSpeech && tts && typeof tts.cancel === 'function') {
      try {
        tts.cancel();
      } catch {
        // 忽略
      }
    }
    words = Array.isArray(nextWords) ? nextWords.slice() : [];
  }

  /**
   * 打字进度变化时调用，把朗读对齐到第 index 个词（0 基）。
   *
   * @param {number} index
   */
  function syncTo(index) {
    if (!words.length) return;
    const raw = Number(index);
    const target = Math.min(words.length - 1, Math.max(0, Number.isFinite(raw) ? Math.trunc(raw) : 0));
    // 已经在读这个词了：不打断它。
    if (target === spokenIndex) return;
    generation += 1; // 让旧会话的回调失效
    playing = false;
    if (tts && typeof tts.cancel === 'function') {
      try {
        tts.cancel();
      } catch {
        // 忽略
      }
    }
    speakWord(target);
  }

  /**
   * 再听一遍当前这个词。
   *
   * 学习者把这个词写错了、或者只是想再听一遍的时候用。
   */
  function repeat() {
    if (!words.length || spokenIndex < 0) return;
    const index = spokenIndex;
    generation += 1;
    playing = false;
    if (tts && typeof tts.cancel === 'function') {
      try {
        tts.cancel();
      } catch {
        // 忽略
      }
    }
    speakWord(index);
  }

  /**
   * @returns {{ spokenIndex: number, playing: boolean }}
   */
  function getState() {
    return { spokenIndex, playing };
  }

  return { setWords, syncTo, repeat, stop, getState };
}
