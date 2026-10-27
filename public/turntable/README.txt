LESPARO 360-degree turntable sets
=================================

One folder per product: pants/ (track pants) and tee/ (T-shirt). Put 8 or more frames in a folder and that
product switches from the four stand-in photos to a smooth 360-degree spin. No code change is needed.

How to shoot (per product)
- Garment on a mannequin or hanger, on a turntable, camera fixed on a tripod. Same light and backdrop for every frame.
- One frame every 10 degrees: 36 frames for a full turn (24 frames at 15 degrees also works).
- Portrait 2:3 frames, about 1400 x 2100 px, JPEG, quality about 80 (each file ~200-300 KB).
- Name them in order: 01.jpg, 02.jpg ... 36.jpg. Frame 01 is the front.

Optional hotspots
Add hotspots.json next to the frames to get numbered points that show while the garment is near that frame:
[ { "frame": 0, "x": 0.5, "y": 0.1, "label": "Drawstring waistband" } ]
x and y are fractions of the frame (0 to 1). frame is the 0-based frame number. Label only what the photograph shows.
