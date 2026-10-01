export const audible = new Set<HTMLMediaElement>();
export const clips = new Set<HTMLMediaElement>();

export const stubPlayback =
  (outcome: 'play' | 'fail' = 'play') =>
  () => {
    const proto = HTMLMediaElement.prototype;
    const { play, pause } = proto;
    const paused = Object.getOwnPropertyDescriptor(proto, 'paused');
    audible.clear();
    clips.clear();
    Object.defineProperty(proto, 'paused', {
      configurable: true,
      get() {
        return !audible.has(this);
      },
    });
    proto.play = function (this: HTMLMediaElement) {
      clips.add(this);
      if (outcome === 'fail') return Promise.reject(new Error('Blocked'));
      audible.add(this);
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    proto.pause = function (this: HTMLMediaElement) {
      audible.delete(this);
      this.dispatchEvent(new Event('pause'));
    };
    return () => {
      proto.play = play;
      proto.pause = pause;
      if (paused) Object.defineProperty(proto, 'paused', paused);
    };
  };
