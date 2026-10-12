# ImageGen 图标素材（2026-10-04）

使用内置 image_gen，透明背景；运行时仅裁切、缩放并编码 WebP，未程序重绘。

## 怪物图集

Use case: stylized-concept
Asset type: transparent 2D game sprite atlas for a polished remake of the 1985 Famicom/NES Bomberman.
Primary request: eight clearly distinct monsters faithfully recognizable from the original NES enemy silhouettes and colors, refined hand-painted arcade toy shading. Each is a compact front-facing full-body orthographic sprite, no perspective board, no scenery. Readable when shrunk to 48 pixels; strong silhouette, clean bold eyes and one subtle upper-left highlight, minimal tiny detail. Consistent scale and lighting. No panels or icon frames.
Composition: exactly 4 columns by 2 rows, equal cells, one centered isolated complete monster per cell. Each creature fills about 65 percent of its cell with generous transparent gutters, no limbs or shadow crossing cell boundaries.
Top row left to right:
1 Ballom: warm orange round balloon monster, small knot and dangling curled string underneath, vertical oval eyes and mischievous little mouth, NO ears, NO feet.
2 Onil: cobalt blue round onion/tomato monster with a small pointed top tuft, squat feet, big light eyes, playful expression, recognizable blue original silhouette.
3 Dahl: pink/magenta low broad rounded diamond/octagonal blob with flat squat base and two eyes, NOT a balloon, NO string.
4 Minvo: warm ochre/orange round grinning face with prominent two square buck teeth and small feet, emphatic funny grin.
Bottom row:
5 Ovapi: pale lavender/pink ghost with two eyes, dome-shaped head and scalloped floating ghost hem, no legs.
6 Kondoria: pale icy cyan irregular soft amorphous blob, broad melting base and pointed wavy upper contour, small eyes, ghostly but distinct from the dome ghost.
7 Pass: orange feline tiger-face monster, pointed triangular cat ears and bold dark cheek/forehead stripes, creamy muzzle, no humanoid body.
8 Pontan: saturated fuchsia circular spinning face with a sly broad grin, asymmetrical curved edge/rounded swirl spikes suggesting rotation, no detached motion trails.
Style: high-quality clean illustrated game sprites, tactile painted surfaces with restrained glossy accents, faithful playful classic character design, consistent outlines rather than photorealism. Faces front, fully visible, empty alpha background. No text, letters, numbers, logos, checkerboard, labels, borders or duplicated creatures.

## 道具图集

Use case: stylized-concept
Asset type: transparent game power-up icon atlas for a refined faithful FC/NES Bomberman remake.
Primary request: eight distinct classic Bomberman power-up symbols made into crisp hand-painted miniature objects; strong clear silhouettes readable at 28–40 pixels, refined soft material shading, consistent front or slight top-front view and upper-left lighting. Authentic recognizable functions, no generic stars for every item.
Composition: exactly 4 columns by 2 rows, equal square cells, one centered isolated object per cell, objects fill about 65 percent of cells, generous completely transparent gutters. No frames or tiles built into the image.
Top row from left:
1 Fire Up: vivid amber and orange upright flame with bright cream core, simple three-tongue silhouette.
2 Bomb Up: glossy dark blue-black spherical bomb with short brass fuse and tiny amber fuse spark, a small distinct plus mark made from two pale solid bars on the bomb surface.
3 Speed Up: one lilac/pink and white classic roller skate with two visible wheels, rounded toe pointing right, clear skate silhouette.
4 Remote Control: compact coral pink classic detonator handheld control with one prominent round button and short antenna, clean recognizable device, no writing.
Bottom row:
5 Wall Pass: a tiny honey/tan brick wall with a cool teal translucent arrow passing through its center.
6 Bomb Pass: a dark round bomb with a cool teal translucent arrow passing through its center, no spark, distinct from Bomb Up.
7 Flame Pass: warm fire with a clear glossy cyan protective shield in front, distinguish shield and flame at small size.
8 Invincibility: a compact beautiful iridescent cyan/green glowing protective vest/armor emblem, five-point pale star inset at center, restrained contained glow.
Style: polished hand-painted arcade inventory symbols consistent with a mint/sand/star-blue toy maze, simple bold forms and just enough material detail, subtle self-contained shadows. Entire subjects visible. Genuine transparent alpha background. No captions, numbers, letters, watermark, logos, checkerboard or background panels.

怪物透明背景编辑：Remove ALL the colored background, glow and atmospheric color around the eight creatures. Produce true fully transparent alpha background. Preserve each of these eight creature paintings and exact 4 columns by 2 rows position, colors, silhouette, eyes and details. No shadow outside silhouette. This is a sprite atlas, every pixel between sprites must be transparent, no background color whatsoever.

## 可复用处理脚本

- `scripts/assets/prepare-bomber-imagegen.mjs`：从保存的图集裁切透明精灵、缩放并编码 WebP，保留 alpha。
- `scripts/assets/prepare-bomber-audio.py <原版MP3目录>`：从本地原版录音裁切短曲、检测循环周期并生成音频配置；来源和校验值见 audio-manifest.json。原版 ROM、NSF 和参考反汇编不在项目素材中保存。

新增主角和场地 14 张素材的完整提示词见 [imagegen-environment-prompts.md](imagegen-environment-prompts.md)，两组源图均保存在本目录；与原有 16 张一起由同一裁切脚本输出。
