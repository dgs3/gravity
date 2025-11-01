const sketch = (p) => {
  const fixedSize = 1000;
  let scaleUnit;
  let pg;

  const G = 1;
  const centralMass = 10000;
  const satelliteMass = .25;
  const orbitRadius = fixedSize * 0.1;
  const dt = 0.01;
  const stepsPerFrame = 50;

  let satellite;
  let currentAcceleration;

  const computeAcceleration = (position) => {
    const distanceSq = Math.max(position.magSq(), 0.25);
    const distance = Math.sqrt(distanceSq);

    if (distance === 0) {
      return p.createVector(0, 0);
    }

    const direction = position.copy().div(distance);
    const magnitude = -(G * centralMass) / distanceSq;
    return direction.mult(magnitude);
  };

  const resetSimulation = () => {
    const initialPosition = p.createVector(orbitRadius, 0);
    const orbitalSpeed = Math.sqrt((G * centralMass) / orbitRadius);
    const initialVelocity = p.createVector(0, -orbitalSpeed);

    satellite = {
      mass: satelliteMass,
      position: initialPosition,
      velocity: initialVelocity,
    };

    currentAcceleration = computeAcceleration(initialPosition.copy());
  };

  const stepSimulation = () => {
    for (let i = 0; i < stepsPerFrame; i += 1) {
      const positionDelta = satellite.velocity.copy().mult(dt);
      const accelerationDelta = currentAcceleration.copy().mult(0.5 * dt * dt);
      satellite.position.add(positionDelta).add(accelerationDelta);

      const newAcceleration = computeAcceleration(satellite.position);
      const velocityDelta = currentAcceleration
        .copy()
        .add(newAcceleration)
        .mult(0.5 * dt);
      satellite.velocity.add(velocityDelta);

      currentAcceleration = newAcceleration;
    }
  };

  const renderScene = () => {
    const centralRadius = Math.max(12, Math.sqrt(centralMass));
    const satelliteRadius = Math.max(4, Math.sqrt(satellite.mass) * 4);

    pg.push();
    pg.clear();
    pg.translate(pg.width / 2, pg.height / 2);
    pg.scale(scaleUnit);

    pg.noStroke();
    pg.fill(255, 220, 160);
    pg.ellipse(0, 0, centralRadius, centralRadius);

    pg.fill(120, 200, 255);
    pg.ellipse(satellite.position.x, satellite.position.y, satelliteRadius, satelliteRadius);

    pg.pop();

    p.background(0);
    p.image(pg, -p.width / 2, -p.height / 2);
  };

  p.setup = () => {
    p.randomSeed($fx.rand() * 1000000);
    p.noiseSeed($fx.rand() * 1000000);
    const w = window.innerWidth;
    const h = window.innerHeight;
    p.createCanvas(w, h, p.WEBGL);
    scaleUnit = Math.min(p.width, p.height) / fixedSize;
    p.pixelDensity(2);
    p.frameRate(60);

    pg = p.createGraphics(w, h);
    pg.pixelDensity(2);

    resetSimulation();
  };

  p.draw = () => {
    stepSimulation();
    renderScene();
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
