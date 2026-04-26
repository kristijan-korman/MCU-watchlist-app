const SHEET_ID   = '1YE9_iqiI4E5TqPD-siPkteysBeptTncu2_MUxvXO7k4';
const MCU_GID    = '0';
const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkYzVkZGE2ZDkyZjczM2IwY2IxNzE4NjM0M2Q5ZWE1MSIsIm5iZiI6MTc3NzExNjk2MS45Miwic3ViIjoiNjllY2E3MjE0ZmI5ZGUyOWI5MjhkMzIyIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.UWGtIFQ997au8SATcddf5NhUAB0p5a9XWhZmBcQfUs8';
const TMDB_IMG   = 'https://image.tmdb.org/t/p/';

const COLLECTIONS_GID = '767783938'; // GID of the COLLECTIONS index sheet
let COLLECTIONS = [
  { gid: '332696986',  name: 'Punisher',                      slug: 'collection_punisher' },
  { gid: '477090108',  name: 'Defenders',                     slug: 'collection_defenders' },
  { gid: '746275232',  name: 'Daredevil',                     slug: 'collection_daredevil' },
  { gid: '1376499614', name: 'S.H.I.E.L.D.',                  slug: 'collection_shield' },
  { gid: '617489229',  name: 'Avengers',                      slug: 'collection_avengers' },
  { gid: '490125252',  name: 'Xmen',                          slug: 'collection_xmen' },
  { gid: '557453725',  name: "Tobey Maguire's Spider-Man",    slug: 'collection_tobey_spiderman' },
  { gid: '740598582',  name: "Andrew Garfield's Spider-Man",  slug: 'collection_amazing_spiderman' },
  { gid: '1817764892', name: "Tom Holland's Spider-Man",      slug: 'collection_mcu_spiderman' },
  { gid: '2003335056', name: 'Spider-Man',                    slug: 'collection_spiderman' },
  { gid: '780000253',  name: 'Loki',                          slug: 'collection_loki' },
  { gid: '1582973501', name: 'Deadpool',                      slug: 'collection_deadpool' },
  { gid: '958345849',  name: 'Kang',                          slug: 'collection_kang' },
]; // also refreshed at runtime from the COLLECTIONS sheet via loadCollectionsConfig()
