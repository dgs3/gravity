const sketch = (p) => {
  const fixedSize = 1000;
  let scaleUnit;
  let pg;

  const G = 1;
  const centralMass = 10000;
  const secondaryMass = 7000;
  const satelliteMass = .25;
  // How far from the center the satellite spawns
  const spawnRadius = fixedSize * 0.48;
  const dt = 0.01;
  const stepsPerFrame = 200;

  let satellite;
  let currentAcceleration;
  let masses = [];

  const computeAcceleration = (position) => {
    const totalAcceleration = p.createVector(0, 0);

    masses.forEach((body) => {
      const direction = body.position.copy().sub(position);
      const distanceSq = Math.max(direction.magSq(), 0.25);
      const distance = Math.sqrt(distanceSq);

      if (distance === 0) {
        return;
      }

      direction
        .div(distance)
        .mult((G * body.mass) / distanceSq);

      totalAcceleration.add(direction);
    });

    return totalAcceleration;
  };

  const resetSimulation = () => {
    // Position the satellite near the left edge so it approaches the central mass from afar.
    const initialPosition = p.createVector(-spawnRadius, fixedSize * 0.08);
    // Use the distance from the origin to compute the circular-orbit speed at that radius.
    const distanceFromCenter = initialPosition.mag();
    const baseSpeed = Math.sqrt((G * centralMass) / distanceFromCenter);

    // Unit vector pointing straight toward the central mass (radial inbound direction).
    const toCenter = initialPosition.copy().mult(-1).normalize();
    // Radial component ensures the satellite actually falls inward toward the mass.
    const approachVelocity = toCenter.copy().mult(baseSpeed * 0.35);
    // Tangential component curves the path so the satellite can swing into orbit.
    const tangentialVelocity = toCenter
      .copy()
      .rotate(p.PI * .75)
      .mult(baseSpeed * 0.85);
    // Combine both components to get the starting velocity vector.
    const initialVelocity = approachVelocity.add(tangentialVelocity);

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
    const satelliteRadius = Math.max(4, Math.sqrt(satellite.mass) * 4);

    pg.push();
    pg.clear();
    pg.translate(pg.width / 2, pg.height / 2);
    pg.scale(scaleUnit);

    pg.noStroke();
    masses.forEach((body) => {
      const [r, g, b] = body.color;
      const radius = Math.max(12, Math.sqrt(body.mass));
      pg.fill(r, g, b);
      pg.ellipse(body.position.x, body.position.y, radius, radius);
    });

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
    const oneThird = fixedSize / 3;
    const firstMassX = -fixedSize / 2 + oneThird;
    const secondMassX = -fixedSize / 2 + oneThird * 2;
    const firstMassY = fixedSize * -.1;
    const secondMassY = fixedSize * .1;
    masses = [
      {
        mass: centralMass,
        position: p.createVector(firstMassX, firstMassY),
        color: [255, 220, 160],
      },
      {
        mass: secondaryMass,
        position: p.createVector(secondMassX, secondMassY),
        color: [180, 200, 255],
      },
    ];

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
