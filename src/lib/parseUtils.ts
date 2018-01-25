/**
 * Parse list of subsequent keys and values into an object.
 * Example: `key1,value1,key2,value2` will parse into `{ key1: 'value1', key2: 'value2' }`
 *
 * @param data comma-separated key-value list
 * @returns object
 */
const parseKeyValueList = (data: string): { [id: string]: string } => {
  return data
    .split(',')
    .reduce(
      (
        res: { [id: string]: string },
        item: string,
        i: number,
        arr: Array<string>
      ) => {
        if (!(i % 2)) {
          res[item.toLowerCase()] = (arr[i + 1] || '').trim();
        }
        return res;
      },
      {}
    );
};

/**
 * Metadata
 *
 * Interface that represents track meta-data
 */
export type Metadata = {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  comment?: string;
  track?: number;
  genre?: string;
};

/**
 * Parse of subsequent keys and values into into Metadata object
 *
 * @param data comma-separated key-value list
 * @returns Metadata
 */
export const parseMetadata = (data: string): Metadata => {
  if (data === '(null)') {
    return {
      title: null,
      artist: null,
      album: null,
      year: null,
      comment: null,
      track: null,
      genre: null
    };
  }
  const raw = parseKeyValueList(data);
  return {
    title: raw.title,
    artist: raw.artist,
    album: raw.album,
    year: raw.year ? parseInt(raw.year, 10) : null,
    comment: raw.comment,
    track: raw.track ? parseInt(raw.track, 10) : null,
    genre: raw.genre
  };
};
