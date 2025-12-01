const sketch = (p) => {
  const fixedSize = 1000;
  const ringMinDistance = 10;
  const ringMaxDistance = 500;
  const captureBlendFactor = 0.15;
  const capturableProbability = 0.25; // 25% chance to be capturable
  const captureProbability = 0.1;
  const uncaptureProbability = 0.001; // How much to blend toward target velocity each frame (0.15 = ~6-7 frames to complete)
  const minNumPlanets = 5;
  const maxNumPlanets = 8;
  let scaleUnit;
  let pg;

  const G = 1;
  const satelliteMass = .25;
  const satelliteVelocityMultiplierMin = .85;
  const satelliteVelocityMultiplierMax = 1.25;
  const dt = 0.01;
  const stepsPerFrame = 10;
  const maxSatellites = 1000;
  const fixedMinPlanetDistance = 200; // Fixed minimum distance between planets (simplified)
  const maxTrailLength = 100; // Maximum number of positions to store in satellite trail
  const spawnRadius = fixedSize * 0.75;
  const spawnProbability = 0.2;

  let masses = [];
  let satellites = [];
  let dyingTrails = []; // Trails of collided satellites that are fading out

  const computeAcceleration = (satellite) => {
    const totalAcceleration = p.createVector(0, 0);
    const affectingMasses = satellite.capturingMass ? [satellite.capturingMass] : masses;
    affectingMasses.forEach((body) => {
      const direction = body.position.copy().sub(satellite.position);
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

  // Check if a planet is within the bounds of the canvas
  const isPlanetWithinBounds = (planet) => {
    const halfSize = fixedSize / 2;
    return (
      planet.position.x >= -halfSize + planet.radius &&
      planet.position.x <= halfSize - planet.radius &&
      planet.position.y >= -halfSize + planet.radius &&
      planet.position.y <= halfSize - planet.radius
    );
  };

  const createAllPlanets = () => {
    const planets = [];
    const halfSize = fixedSize / 2;

    // Grid-based placement
    const gridSize = 4; // 4x4 grid = 16 possible positions
    const cellSize = fixedSize / gridSize;
    const cellMargin = cellSize * 0.3; // Margin within each cell

    // Shuffle grid positions for randomness
    const gridPositions = [];
    for (let x = 0; x < gridSize; x += 1) {
      for (let y = 0; y < gridSize; y += 1) {
        gridPositions.push({ x, y });
      }
    }
    // Shuffle the grid positions
    for (let i = gridPositions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(p.random(i + 1));
      [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
    }

    // Place planets in grid cells
    const numPlanets = Math.floor(p.random(minNumPlanets, maxNumPlanets)); // Random number of planets
    for (let i = 0; i < numPlanets && i < gridPositions.length; i += 1) {
      const gridPos = gridPositions[i];
      const cellCenterX = -halfSize + (gridPos.x + 0.5) * cellSize;
      const cellCenterY = -halfSize + (gridPos.y + 0.5) * cellSize;

      // Random position within cell (with margin)
      const attrs = createRandomPlanetAttributes();
      let planetX = cellCenterX + p.random(-cellMargin, cellMargin);
      let planetY = cellCenterY + p.random(-cellMargin, cellMargin);

      // Clamp position to ensure planet (including radius) stays within bounds
      planetX = p.constrain(planetX, -halfSize + attrs.radius, halfSize - attrs.radius);
      planetY = p.constrain(planetY, -halfSize + attrs.radius, halfSize - attrs.radius);

      const planet = {
        ...attrs,
        position: p.createVector(planetX, planetY),
      };

      // Simple validation: check if far enough from existing planets
      let isValid = true;
      if (isPlanetWithinBounds(planet)) {
        for (const existing of planets) {
          const distance = planet.position.dist(existing.position);
          if (distance < fixedMinPlanetDistance) {
            isValid = false;
            break;
          }
        }
      } else {
        isValid = false;
      }

      if (isValid) {
        planets.push(planet);
      }
    }

    return planets;
  };

  const calculateInitialVelocity = (initialPosition, targetPosition) => {
    // Use the distance from the origin to compute the circular-orbit speed at that radius.
    // Use average mass for edge-spawned satellites
    const avgMass = masses.reduce((sum, body) => sum + body.mass, 0) / masses.length;
    const distanceFromTarget = targetPosition.dist(initialPosition);
    const baseSpeed = Math.sqrt((G * avgMass) / distanceFromTarget) * p.random(satelliteVelocityMultiplierMin, satelliteVelocityMultiplierMax);

    // Unit vector pointing straight toward the central mass (radial inbound direction).
    const toCenter = initialPosition.copy().mult(-1).normalize();
    // Radial component ensures the satellite actually falls inward toward the mass.
    const approachVelocity = toCenter.copy().mult(baseSpeed);
    // Tangential component curves the path so the satellite can swing into orbit.
    const tangentialVelocity = toCenter
      .copy()
      .mult(baseSpeed);
    // Combine both components to get the starting velocity vector.
    const initialVelocity = approachVelocity.add(tangentialVelocity);
    return initialVelocity;
  };


  const createSatellite = (initialPosition, targetPosition) => {
    const initialVelocity = calculateInitialVelocity(initialPosition, targetPosition);
    const initialAcceleration = computeAcceleration(initialPosition.copy());

    return {
      mass: satelliteMass,
      position: initialPosition.copy(),
      velocity: initialVelocity,
      acceleration: initialAcceleration,
      capturingMass: null,
      trail: [initialPosition.copy()],
      capturable: p.random() > capturableProbability? true : false, // Initialize trail with starting position
    };
  };

  const spawnSatelliteAtEdge = (targetPosition) => {
    const side = Math.floor(p.random(4));
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
      const collisionBody = masses.find((body) => {
        const bodyRadius = getBodyRadius(body);
        const distance = sat.position.dist(body.position);
        return distance <= bodyRadius + satelliteRadius;
      });
      
      const ejected = masses.some((body) => {
        const distance = sat.position.dist(body.position);
        return distance >= fixedSize * 3;
      });
      
      // If collided, extract trail to dyingTrails
      if (collisionBody && sat.trail && sat.trail.length > 0) {
        dyingTrails.push({
          trail: sat.trail.map((pos) => pos.copy()), // Copy trail positions
          fadeTime: 60, // Frames to fade out
        });
        return false; // Remove satellite
      }
      
      // If ejected, just remove (no trail fade)
      if (ejected) {
        return false;
      }
      
      return true; // Keep satellite
    });
  };

  const calculateTargetVelocity = (satellite, planet) => {
    const distance = satellite.position.dist(planet.position);
    const baseSpeed = Math.sqrt((G * planet.mass) / distance);
    const vectorToPlanet = planet.position.copy().sub(satellite.position).normalize();
    
    // Calculate both tangential directions (clockwise and counterclockwise)
    const tangentialCW = vectorToPlanet.copy().rotate(p.HALF_PI).normalize();
    const tangentialCCW = vectorToPlanet.copy().rotate(-p.HALF_PI).normalize();
    
    // Get current velocity direction
    const currentVelocityDir = satellite.velocity.copy().normalize();
    
    // Calculate angle differences using dot product (closer to 1 = more aligned)
    const dotCW = currentVelocityDir.dot(tangentialCW);
    const dotCCW = currentVelocityDir.dot(tangentialCCW);
    
    // Choose the tangential direction closest to current velocity
    const tangentialDirection = dotCW > dotCCW ? tangentialCW : tangentialCCW;
    
    return tangentialDirection.copy().mult(baseSpeed);
  };

  const randomlyUncaptureSatellites = () => {
    satellites.forEach((satellite) => {
      if (p.random() < uncaptureProbability) {
        satellite.capturingMass = null;
        satellite.capturable = false;
      }
    });
  };

  const randomlyCaptureSatellites = () => {
    satellites.forEach((satellite) => {
      if (!satellite.capturable) {
        return;
      }
      // If already capturing, gradually blend velocity toward target
      if (satellite.capturingMass) {
        const targetVelocity = calculateTargetVelocity(satellite, satellite.capturingMass);
        // Gradually blend current velocity toward target velocity
        satellite.velocity.lerp(targetVelocity, captureBlendFactor);
        return;
      }
      
      // Check for new capture opportunities
      const closestPlanet = masses.reduce((closest, body) => {
        return satellite.position.dist(body.position) < satellite.position.dist(closest.position) ? body : closest;
      }, masses[0]);
      const minDistance = satellite.position.dist(closestPlanet.position);
      
      // Check if satellite is within ring distance range
      if (minDistance >= ringMinDistance && minDistance <= ringMaxDistance) {
        // Check if velocity is somewhat tangential to the planet
        const radiusVector = closestPlanet.position.copy().sub(satellite.position).normalize();
        const velocityDir = satellite.velocity.copy().normalize();
        const dotProduct = radiusVector.dot(velocityDir);
        
        // Dot product close to 0 means perpendicular (tangential)
        // Allow some tolerance: -0.5 to 0.5 means angle between ~60-120 degrees
        const isTangential = Math.abs(dotProduct) < 0.5;
        
        // Only capture if velocity is tangential and random chance succeeds
        if (isTangential && p.random() < captureProbability) {
          // Mark satellite as capturing (will blend velocity gradually)
          satellite.capturingMass = closestPlanet;
        }
      }
    });
  };

  const stepSimulation = () => {
    for (let i = 0; i < stepsPerFrame; i += 1) {
      satellites.forEach((satellite) => {
        const positionDelta = satellite.velocity.copy().mult(dt);
        const accelerationDelta = satellite.acceleration.copy().mult(0.5 * dt * dt);
        satellite.position.add(positionDelta).add(accelerationDelta);

        const newAcceleration = computeAcceleration(satellite);
        const velocityDelta = satellite.acceleration
          .copy()
          .add(newAcceleration)
          .mult(0.5 * dt);
        satellite.velocity.add(velocityDelta);

        satellite.acceleration = newAcceleration;
      });
    }
    // Update trails once per frame (after all physics steps)
    satellites.forEach((satellite) => {
      satellite.trail.push(satellite.position.copy());
      if (satellite.trail.length > maxTrailLength) {
        satellite.trail.shift(); // Remove oldest position
      }
    });
    // Correct orbits once per frame (after all physics steps)
    randomlyCaptureSatellites();
    randomlyUncaptureSatellites();
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

    // Render dying trails (fading out after collision)
    dyingTrails.forEach((dying) => {
      if (dying.trail && dying.trail.length > 1) {
        const ctx = pg.drawingContext;
        const startPos = dying.trail[0];
        const endPos = dying.trail[dying.trail.length - 1];
        const maxFadeTime = 60;
        const alpha = (dying.fadeTime / maxFadeTime) * 0.8; // Fade from 0.8 to 0
        
        // Create gradient from transparent (oldest) to fading (newest)
        const gradient = ctx.createLinearGradient(
          startPos.x, startPos.y,
          endPos.x, endPos.y
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, 0)`); // Transparent at start
        gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`); // Fading at end
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 / scaleUnit;
        ctx.beginPath();
        ctx.moveTo(dying.trail[0].x, dying.trail[0].y);
        for (let i = 1; i < dying.trail.length; i += 1) {
          ctx.lineTo(dying.trail[i].x, dying.trail[i].y);
        }
        ctx.stroke();
      }
    });

    // Render satellite trails
    satellites.forEach((satellite) => {
      if (satellite.trail && satellite.trail.length > 1) {
        const ctx = pg.drawingContext;
        const startPos = satellite.trail[0];
        const endPos = satellite.trail[satellite.trail.length - 1];
        
        // Create gradient from transparent (oldest) to opaque (newest)
        const gradient = ctx.createLinearGradient(
          startPos.x, startPos.y,
          endPos.x, endPos.y
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Transparent at start (oldest)
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)'); // Semi-opaque at end (newest)
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1 / scaleUnit; // Scale line width with zoom
        ctx.beginPath();
        ctx.moveTo(satellite.trail[0].x, satellite.trail[0].y);
        for (let i = 1; i < satellite.trail.length; i += 1) {
          ctx.lineTo(satellite.trail[i].x, satellite.trail[i].y);
        }
        ctx.stroke();
      }
    });

    // Render satellite points
    pg.stroke('white');
    pg.strokeWeight(2);
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
    if (p.random() < spawnProbability) {
      const randomPlanet = masses[Math.floor(p.random(masses.length))];
      spawnSatelliteAtEdge(randomPlanet.position);
    }

    stepSimulation();
    cullCollidedSatellites();
    // Update dying trails (decrement fadeTime, remove when done)
    dyingTrails = dyingTrails.filter((dying) => {
      dying.fadeTime -= 1;
      return dying.fadeTime > 0;
    });
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
