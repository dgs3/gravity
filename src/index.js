const sketch = (p) => {
  const fixedSize = 1000;
  let scaleUnit;
  let pg;

  const G = 1;
  const satelliteMass = .25;
  // How far from the center the satellite spawns
  const spawnRadius = fixedSize * 0.48;
  const dt = 0.01;
  const stepsPerFrame = 10;
  const spawnProbability = 0.2;
  const orbitalProbability = 0.05; // Probability of a satellite orbiting a planet
  const maxSatellites = 5000;
  const minPlanetSpacingMultiplier = 5; // Minimum gap between planets is 3x the new planet's radius

  let masses = [];
  let satellites = [];

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

  const getBodyRadius = (body) => body.radius;
  // Satellites are rendered as a single point
  const getSatelliteRadius = () => 1;

  const createRandomPlanetAttributes = () => {
    const mass = p.random(5000, 10000);
    // Random radius between 30 and 80
    const radius = p.random(30, 80);
    // Random color with some warmth bias (yellow-orange-red tones)
    const r = p.random(200, 255);
    const g = p.random(150, 220);
    const b = p.random(100, 180);
    const color = [r, g, b];

    return { mass, radius, color };
  };

  const isPlanetWithinBounds = (planet) => {
    const halfSize = fixedSize / 2;
    return (
      planet.position.x >= -halfSize + planet.radius &&
      planet.position.x <= halfSize - planet.radius &&
      planet.position.y >= -halfSize + planet.radius &&
      planet.position.y <= halfSize - planet.radius
    );
  };

  const getMinimumDistance = (planet, existingPlanets) => {
    if (existingPlanets.length === 0) return Infinity;
    return Math.min(...existingPlanets.map((existing) => {
      const distance = planet.position.dist(existing.position);
      // Minimum distance: planet radius + gap (minPlanetSpacingMultiplier x planet radius) + existing planet radius
      const minSeparation = planet.radius + (planet.radius * minPlanetSpacingMultiplier) + existing.radius;
      return distance - minSeparation;
    }));
  };

  const tryPlacePlanet = (newPlanet, existingPlanets, maxAttempts = 100) => {
    const halfSize = fixedSize / 2;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const x = p.random(-halfSize + newPlanet.radius, halfSize - newPlanet.radius);
      const y = p.random(-halfSize + newPlanet.radius, halfSize - newPlanet.radius);
      newPlanet.position = p.createVector(x, y);

      if (!isPlanetWithinBounds(newPlanet)) {
        continue; // Skip if out of bounds
      }

      const minDistance = getMinimumDistance(newPlanet, existingPlanets);
      if (minDistance >= 0) {
        return true; // Successfully placed
      }
    }
    return false; // Failed to place after max attempts
  };

  const createAllPlanets = () => {
    const numPlanets = Math.floor(p.random(3, 7)); // Random number between 2-6
    const planets = [];
    const halfSize = fixedSize / 2;

    // First, create a cluster of at least 2 planets close together
    // Use a conservative margin to ensure planets fit even with their radii
    const maxRadius = 80; // Maximum possible planet radius
    const clusterMargin = maxRadius * 2; // Extra margin for cluster placement
    const clusterCenterX = p.random(-halfSize + clusterMargin, halfSize - clusterMargin);
    const clusterCenterY = p.random(-halfSize + clusterMargin, halfSize - clusterMargin);
    const clusterSpread = fixedSize * 0.15; // How close the clustered planets are

    // Place first planet in cluster
    const planet1Attrs = createRandomPlanetAttributes();
    let planet1 = {
      ...planet1Attrs,
      position: p.createVector(0, 0),
    };
    // Ensure first planet is within bounds
    for (let attempt = 0; attempt < 100; attempt += 1) {
      planet1.position = p.createVector(
        clusterCenterX + p.random(-clusterSpread, clusterSpread),
        clusterCenterY + p.random(-clusterSpread, clusterSpread),
      );
      if (isPlanetWithinBounds(planet1)) {
        break;
      }
    }
    planets.push(planet1);

    // Place second planet in cluster (close to first, but with minimum spacing)
    const planet2Attrs = createRandomPlanetAttributes();
    let planet2 = { ...planet2Attrs, position: p.createVector(0, 0) };
    for (let attempt = 0; attempt < 100; attempt += 1) {
      planet2.position = p.createVector(
        clusterCenterX + p.random(-clusterSpread, clusterSpread),
        clusterCenterY + p.random(-clusterSpread, clusterSpread),
      );
      if (!isPlanetWithinBounds(planet2)) {
        continue;
      }
      const minDistance = getMinimumDistance(planet2, planets);
      if (minDistance >= 0) {
        break;
      }
    }
    planets.push(planet2);

    // Place remaining planets with proper spacing
    for (let i = 2; i < numPlanets; i += 1) {
      const attrs = createRandomPlanetAttributes();
      const newPlanet = { ...attrs, position: p.createVector(0, 0) };
      if (tryPlacePlanet(newPlanet, planets)) {
        planets.push(newPlanet);
      }
    }

    return planets;
  };

  // Create a satellite that orbits a planet
  const createSatelliteOrbitingPlanet = (targetPlanet) => {
    const radiusMultiplier = p.random(1, 3);
    // Place the satellite at a distance very close to the planet
    const initialPosition = targetPlanet.position.copy().add(p.createVector(0, targetPlanet.radius * radiusMultiplier));
    const distanceFromTarget = targetPlanet.position.dist(initialPosition);
    // Calculate the speed at which a satellite will stabily orbit the planet to form rings
    const baseSpeed = Math.sqrt((G * targetPlanet.mass) / distanceFromTarget);
    const vectorToPlanet = targetPlanet.position.copy().sub(initialPosition).normalize();
    // Calculate the tangential direction of the satellite's velocity
    const tangentialDiection = vectorToPlanet.copy().rotate(p.HALF_PI).normalize();
    // Calculate the initial velocity of the satellite
    const initialVelocity = tangentialDiection.copy().mult(baseSpeed);
    // Calculate the initial acceleration of the satellite
    const initialAcceleration = computeAcceleration(initialPosition.copy());
    return {
      mass: satelliteMass,
      position: initialPosition.copy(),
      velocity: initialVelocity,
      acceleration: initialAcceleration,
    };
  };

  const createSatellite = (initialPosition, targetPosition) => {
    // Use the distance from the origin to compute the circular-orbit speed at that radius.
    // Use average mass for edge-spawned satellites
    const avgMass = masses.reduce((sum, body) => sum + body.mass, 0) / masses.length;
    const distanceFromTarget = targetPosition.dist(initialPosition);
    const baseSpeed = Math.sqrt((G * avgMass) / distanceFromTarget);

    // Unit vector pointing straight toward the central mass (radial inbound direction).
    const toCenter = initialPosition.copy().mult(-1).normalize();
    // Radial component ensures the satellite actually falls inward toward the mass.
    const approachVelocity = toCenter.copy().mult(baseSpeed);
    // Tangential component curves the path so the satellite can swing into orbit.
    const tangentialVelocity = toCenter
      .copy()
      .rotate(p.PI * .75)
      .mult(baseSpeed * 0.85);
    // Combine both components to get the starting velocity vector.
    const initialVelocity = approachVelocity.add(tangentialVelocity);
    const initialAcceleration = computeAcceleration(initialPosition.copy());

    return {
      mass: satelliteMass,
      position: initialPosition.copy(),
      velocity: initialVelocity,
      acceleration: initialAcceleration,
    };
  };

  const spawnSatelliteOrbitingPlanet = (targetPlanet) => {
    satellites.push(createSatelliteOrbitingPlanet(targetPlanet));
  };

  const spawnSatelliteAtEdge = (targetPosition) => {
    // const side = Math.floor(p.random(4));
    const side = 0;
    const range = spawnRadius;
    let spawnPosition;

    switch (side) {
      case 0:
        spawnPosition = p.createVector(-spawnRadius, p.random(-range, range));
        break;
      case 1:
        spawnPosition = p.createVector(spawnRadius, p.random(-range, range));
        break;
      case 2:
        spawnPosition = p.createVector(p.random(-range, range), -spawnRadius);
        break;
      default:
        spawnPosition = p.createVector(p.random(-range, range), spawnRadius);
        break;
    }

    satellites.push(createSatellite(spawnPosition, targetPosition));

    if (satellites.length > maxSatellites) {
      satellites.shift();
    }
  };

  const cullCollidedSatellites = () => {
    const satelliteRadius = getSatelliteRadius();
    satellites = satellites.filter((sat) => {
      return !masses.some((body) => {
        const bodyRadius = getBodyRadius(body);
        const distance = sat.position.dist(body.position);
        const hasCollision = distance <= bodyRadius + satelliteRadius;
        const hasEjected = distance >= fixedSize * 3
        return hasCollision || hasEjected;
      });
    });
  };

  const stepSimulation = () => {
    for (let i = 0; i < stepsPerFrame; i += 1) {
      satellites.forEach((satellite) => {
        const positionDelta = satellite.velocity.copy().mult(dt);
        const accelerationDelta = satellite.acceleration.copy().mult(0.5 * dt * dt);
        satellite.position.add(positionDelta).add(accelerationDelta);

        const newAcceleration = computeAcceleration(satellite.position);
        const velocityDelta = satellite.acceleration
          .copy()
          .add(newAcceleration)
          .mult(0.5 * dt);
        satellite.velocity.add(velocityDelta);

        satellite.acceleration = newAcceleration;
      });
    }
  };

  const renderScene = () => {
    const satelliteRadius = getSatelliteRadius();

    pg.push();
    pg.clear();
    pg.translate(pg.width / 2, pg.height / 2);
    pg.scale(scaleUnit);

    pg.noStroke();
    masses.forEach((body) => {
      const [r, g, b] = body.color;
      const radius = getBodyRadius(body);
      pg.fill(r, g, b);
      pg.ellipse(body.position.x, body.position.y, radius * 2, radius * 2);
    });

    pg.stroke('white');
    pg.strokeWeight(1);
    satellites.forEach((satellite) => {
      pg.point(satellite.position.x, satellite.position.y);
    });

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
    masses = createAllPlanets();
  };

  p.draw = () => {
    if (p.random() < orbitalProbability) {
      const randomPlanet = masses[Math.floor(p.random(masses.length))];
      spawnSatelliteOrbitingPlanet(randomPlanet);
    }
    if (p.random() < spawnProbability) {
      const randomPlanet = masses[Math.floor(p.random(masses.length))];
      spawnSatelliteAtEdge(randomPlanet.position);
    }

    stepSimulation();
    cullCollidedSatellites();
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
