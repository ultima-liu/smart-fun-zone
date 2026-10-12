// Build against Game Music Emu's NSF target; no game ROM is used at runtime.
#include "gme/gme.h"
#include <cstdio>
#include <cstdlib>
#include <vector>
int main(int argc, char **argv) {
  if (argc != 5) { fprintf(stderr, "usage: render-contra-nsf source.nsf track seconds output.pcm\n"); return 1; }
  Music_Emu *emu = nullptr;
  auto error = gme_open_file(argv[1], &emu, 44100);
  if (error) { fprintf(stderr, "%s\n", error); return 2; }
  gme_ignore_silence(emu, 1);
  error = gme_start_track(emu, atoi(argv[2]) - 1);
  if (error) { fprintf(stderr, "%s\n", error); gme_delete(emu); return 3; }
  std::vector<short> samples(atoi(argv[3]) * 44100 * 2);
  error = gme_play(emu, samples.size(), samples.data());
  if (error) { fprintf(stderr, "%s\n", error); gme_delete(emu); return 4; }
  FILE *file = fopen(argv[4], "wb");
  if (!file) { gme_delete(emu); return 5; }
  fwrite(samples.data(), sizeof(short), samples.size(), file); fclose(file); gme_delete(emu);
}
