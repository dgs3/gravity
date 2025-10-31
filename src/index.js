const sketch = (p) => {
  let fixedSize = 1000;
  // Scaling factor for the entire sketch.
  let scaleUnit;
  // Graphics object used to draw everything.
  let pg;
  let el_width = 100;
  let el_height = 100;

  p.setup = () => {
    p.randomSeed($fx.rand() * 1000000);
    p.noiseSeed($fx.rand() * 1000000);
    const w = window.innerWidth;
    const h = window.innerHeight;
    p.createCanvas(w, h, p.WEBGL);
    // Dynamically calculate how much we need to scale the entire sketch by.
    // This ensures that the sketch scales well with the window size.
    scaleUnit = Math.min(p.width, p.height) / fixedSize;
    // Allows for crisper images on retina displays.
    p.pixelDensity(2);

    pg = p.createGraphics(w, h);
    // Allows for crisper images on retina displays.
    pg.pixelDensity(2);
  };

  p.draw = () => {
    el_width += p.random(-2, 2);
    el_height += p.random(-2, 2);
    pg.push();
    pg.clear();
    // Start drawing at the center of the screen.
    pg.translate(pg.width / 2, pg.height / 2);
    // Scale the sketch up/down to allow for dimensionless.
    pg.scale(scaleUnit);
    pg.ellipse(el_width, el_height, p.width/2, p.height/2);
    pg.pop();
    // Draw the graphics buffer to screen.
    p.image(pg, -p.width / 2, -p.height / 2);
  };

  p.windowResized = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    p.resizeCanvas(w, h);
    // Regenerate graphics buffer
    pg = p.createGraphics(w, h);
    pg.pixelDensity(2);
    // Recalculate scaleUnit for updated canvas size.
    scaleUnit = Math.min(p.width, p.height) / fixedSize;
  };
};

new p5(sketch);
