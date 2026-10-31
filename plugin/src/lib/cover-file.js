/**
 * The client half of the cover channel.
 *
 * A cover is a picture, not a record: it does not belong inside the shelf
 * JSON. Six books with their covers inlined are 1.86 MB of base64 that the
 * shelf list does not need — the grid draws a cover at ~168 px, so the bytes
 * go on their own request, the way the source files do, and the browser keeps
 * them in its image cache.
 *
 * The Host answers with the picture itself (`image/jpeg` and the like), not
 * with a JSON envelope: the address goes into the `<img src>` and the browser
 * does the rest.
 *
 * If the image request does not come back — an application whose protocol
 * handler does not serve plain image requests — the bytes are fetched by
 * hand and handed to the `<img>` as an object URL. The picture then comes
 * from the same place, only through a different door.
 */

/** The route the Host registers for the cover images. */
export const COVER_ROUTE = '/api/reader/cover';

/** Raised when the Host could not be reached at all. */
const NETWORK_MESSAGE = '无法连接宿主服务，封面暂时不可用';

/**
 * The object URLs of this page session, by cover address.
 *
 * The same cover is asked for again whenever the learner goes back to the
 * shelf; it is fetched once.
 *
 * @type {Map<string, string>}
 */
const objectUrls = new Map();

/**
 * Fetch the bytes of a cover.
 *
 * @param {string} url - the address of the cover.
 * @param {object} [options] - the call options.
 * @param {Function} [options.fetch] - the fetch implementation.
 * @returns {Promise<{ bytes: Uint8Array, mime: string }>} the bytes and the type.
 */
export async function fetchCoverBytes(url, options = {}) {
  const doFetch = typeof options?.fetch === 'function' ? options.fetch : globalThis.fetch;
  if (typeof doFetch !== 'function') throw new Error(NETWORK_MESSAGE);
  let response;
  try {
    response = await doFetch(url, { method: 'GET' });
  } catch (error) {
    const failure = new Error(NETWORK_MESSAGE);
    failure.cause = error;
    throw failure;
  }
  if (!response.ok) throw new Error(`封面请求失败（HTTP ${response.status}）`);
  const buffer = await response.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    mime: response.headers?.get?.('content-type') ?? 'application/octet-stream',
  };
}

/**
 * The size of the stored cover, as its address says it.
 *
 * The Host puts the size of the cover into the address, so the page knows
 * how big a picture is without downloading it: a picture that is still the
 * full size of the model's drawing has to be shrunk once, and the others are
 * left alone.
 *
 * @param {string} address - the address of the cover.
 * @returns {number} the size of the stored cover, 0 when the address does
 *   not say.
 */
export function coverSizeOf(address) {
  const match = /[?&]s=(\d+)/.exec(String(address ?? ''));
  return match === null ? 0 : Number(match[1]);
}

/**
 * The object URL of a cover, fetched by hand.
 *
 * The same address is only fetched once per page session.
 *
 * @param {string} url - the address of the cover.
 * @param {object} [options] - the call options.
 * @param {Function} [options.fetch] - the fetch implementation.
 * @returns {Promise<string>} the object URL.
 */
export async function coverObjectUrl(url, options = {}) {
  const key = String(url ?? '');
  const known = objectUrls.get(key);
  if (known !== undefined) return known;
  const { bytes, mime } = await fetchCoverBytes(key, options);
  if (typeof URL?.createObjectURL !== 'function') {
    throw new Error('当前环境不支持显示封面');
  }
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  objectUrls.set(key, objectUrl);
  return objectUrl;
}
