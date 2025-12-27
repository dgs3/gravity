const sketch = (p) => {
  const fixedSize = 1000;
  const spawnProbability = 0.5;
  const laneMinMultiplier = 1.1;
  const laneMaxMultiplier = 2.0;
  const laneCountMin = 30;
  const laneCountMax = 80;
  let scaleUnit;
  let pg;

  const G = 1;
  const satelliteMass = .25;
  const dt = 0.01;
  const stepsPerFrame = 50;
  const numSatellitesRange = 200
  const maxSatellites = 1000 + Math.floor(p.random(numSatellitesRange));
  const initialSatelliteCount = 400;
  const maxTrailLength = 800; // Maximum number of positions to store in satellite trail
  const trailUpdateFrequency = 3; // Update trail every N frames

  let masses = [];
  let satellites = [];

  const computeAcceleration = (satellite) => {
    let ax = 0;
    let ay = 0;
    const sx = satellite.position.x;
    const sy = satellite.position.y;
    
    masses.forEach((body) => {
      const dx = body.position.x - sx;
      const dy = body.position.y - sy;
      const distanceSq = Math.max(dx * dx + dy * dy, 0.25);
      const distance = Math.sqrt(distanceSq);

      if (distance === 0) {
        return;
      }

      const force = (G * body.mass) / distanceSq;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      
      ax += fx;
      ay += fy;
    });

    return p.createVector(ax, ay);
  };

  const getBodyRadius = (body) => body.radius;
  // Satellites are rendered as a single point
  const getSatelliteRadius = () => 1;

  const PLANET_TYPES = {
    GAS_GIANT: 'gasGiant',
  };

  const createPlanetAttributes = () => {
    const mass = p.random(5000, 10000);
    
    // Gas giants: larger radius (50-80)
    const radius = p.random(50, 80);
    
    // Yellow-orange-red tones (Jupiter-like)
    const color = [p.random(200, 255), p.random(150, 220), p.random(100, 180)];

    return { mass, radius, color, type: PLANET_TYPES.GAS_GIANT };
  };

  const createSinglePlanet = () => {
    const halfSize = fixedSize / 2;
    
    // Create a large gas giant that's bigger than the canvas
    // Radius should be large enough to fill ~1/3 of canvas when viewed
    const attrs = createPlanetAttributes();
    // Override radius to be large (bigger than canvas)
    attrs.radius = fixedSize;
    
    // Position planet so it's in the first or second third of the canvas
    // Center can be off-canvas, but we want part of it visible
    const positionX = fixedSize;
    const positionY = p.random(-halfSize, halfSize);
    
    const planet = {
      ...attrs,
      position: p.createVector(positionX, positionY),
    };
    
    // Generate orbital lanes
    const numLanes = Math.floor(p.random(laneCountMin, laneCountMax)); // Random between 5-50
    const lanes = [];
    const minDistance = planet.radius * laneMinMultiplier;
    const maxDistance = planet.radius * laneMaxMultiplier;
    
    for (let i = 0; i < numLanes; i += 1) {
      lanes.push(p.random(minDistance, maxDistance));
    }
    
    planet.lanes = lanes;
    
    return [planet];
  };

  const spawnSatelliteInOrbit = (planet) => {
    // Randomly select a lane from the planet's pre-generated lanes
    const laneIndex = Math.floor(p.random(planet.lanes.length));
    const orbitalDistance = planet.lanes[laneIndex];
    
    // Calculate random angle around planet
    const angle = p.random(0, p.TWO_PI);
    
    // Calculate spawn position relative to planet
    const spawnPosition = p.createVector(
      planet.position.x + Math.cos(angle) * orbitalDistance,
      planet.position.y + Math.sin(angle) * orbitalDistance
    );
    
    // Calculate circular orbit velocity
    const baseSpeed = Math.sqrt((G * planet.mass) / orbitalDistance);
    
    // Tangential direction perpendicular to radius vector
    const vectorToPlanet = planet.position.copy().sub(spawnPosition).normalize();
    // Choose random tangential direction (clockwise or counterclockwise)
    const tangentialDirection = laneIndex % 2 === 0 
      ? vectorToPlanet.copy().rotate(p.HALF_PI).normalize()
      : vectorToPlanet.copy().rotate(-p.HALF_PI).normalize();
    
    const orbitalVelocity = tangentialDirection.copy().mult(baseSpeed);
    
    // Create satellite with orbital velocity
    const satellite = {
      mass: satelliteMass,
      position: spawnPosition.copy(),
      velocity: orbitalVelocity,
      trail: {
        positions: new Array(maxTrailLength), // Don't pre-initialize
        index: 1, // Points to next write position
        length: 1, // One position has been written
      },
    };
    // Initialize first trail position
    satellite.trail.positions[0] = spawnPosition.copy();
    
    // Calculate initial acceleration
    satellite.acceleration = computeAcceleration(satellite);
    
    satellites.push(satellite);
    
    if (satellites.length > maxSatellites) {
      satellites.shift();
    }
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
    // Update trails every N frames (after all physics steps)
    if (p.frameCount % trailUpdateFrequency === 0) {
      satellites.forEach((satellite) => {
        const trail = satellite.trail;
        // Write to current index
        trail.positions[trail.index] = satellite.position.copy();
        
        // Advance index and update length
        trail.index = (trail.index + 1) % maxTrailLength;
        if (trail.length < maxTrailLength) {
          trail.length++;
        }
      });
    }
  };

  const drawGasGiant = (body) => {
    const [r, g, b] = body.color;
    const radius = getBodyRadius(body);
    const centerX = body.position.x;
    const centerY = body.position.y;
    
    // Draw gas giant with horizontal bands
    pg.push();
    pg.translate(centerX, centerY);
    
    // Draw bands from top to bottom
    for (let y = -radius; y < radius; y += 1.5) {
      // Calculate width of band at this y position (circular cross-section)
      const xWidth = Math.sqrt(radius * radius - y * y);
      
      // Use noise to create banding pattern (Jupiter-like)
      const noiseX = centerX * 0.01;
      const noiseY = (centerY + y) * 0.02;
      const noiseTime = p.frameCount * 0.0005; // Slow animation
      const noiseValue = p.noise(noiseX, noiseY, noiseTime);
      
      // Vary color based on noise (Jupiter-like color variation)
      const colorVariation = (noiseValue - 0.5) * 40;
      const bandR = p.constrain(r + colorVariation, 150, 255);
      const bandG = p.constrain(g + colorVariation * 0.7, 120, 220);
      const bandB = p.constrain(b + colorVariation * 0.5, 80, 180);
      
      pg.fill(bandR, bandG, bandB);
      
      // Draw thin horizontal ellipse (creates circular band)
      pg.ellipse(0, y, xWidth * 2, 1.5);
    }
    
    pg.pop();
  };

  const drawPlanet = (body) => {
    drawGasGiant(body);
  };

  const getVisibleSatellites = () => {
    const halfSize = fixedSize / 2;
    const margin = 50; // Small margin for smooth rendering

    return satellites.filter((satellite) => {
      // Check if satellite position is visible
      const x = satellite.position.x;
      const y = satellite.position.y;
      const positionVisible = (
        x >= -halfSize - margin &&
        x <= halfSize + margin &&
        y >= -halfSize - margin &&
        y <= halfSize + margin
      );
      
      if (positionVisible) return true;
      
      // Check if any point in the trail is visible
      if (satellite.trail && satellite.trail.length > 0) {
        const trail = satellite.trail;
        // Iterate through trail: if not full, start at 0; if full, start at index (oldest)
        const startIndex = trail.length < maxTrailLength ? 0 : trail.index;
        for (let i = 0; i < trail.length; i += 1) {
          const posIndex = (startIndex + i) % maxTrailLength;
          const pos = trail.positions[posIndex];
          if (pos && (
            pos.x >= -halfSize - margin &&
            pos.x <= halfSize + margin &&
            pos.y >= -halfSize - margin &&
            pos.y <= halfSize + margin
          )) {
            return true;
          }
        }
      }
      
      return false;
    });
  };

  const renderScene = () => {
    pg.push();
    pg.clear();
    pg.translate(pg.width / 2, pg.height / 2);
    pg.scale(scaleUnit);

    pg.noStroke();
    masses.forEach((body) => {
      drawPlanet(body);
    });

    // Get visible satellites (position or trail visible)
    const visibleSatellites = getVisibleSatellites();

    // Render satellite trails (only for visible satellites)
    visibleSatellites.forEach((satellite) => {
      if (satellite.trail && satellite.trail.length > 1) {
        const trail = satellite.trail;
        const ctx = pg.drawingContext;
        
        // Get start index: if not full, start at 0; if full, start at index (oldest)
        const startIndex = trail.length < maxTrailLength ? 0 : trail.index;
        const oldestIndex = startIndex;
        const newestIndex = (startIndex + trail.length - 1) % maxTrailLength;
        const startPos = trail.positions[oldestIndex];
        const endPos = trail.positions[newestIndex];
        
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
        
        // Draw trail from oldest to newest
        for (let i = 0; i < trail.length; i += 1) {
          const posIndex = (startIndex + i) % maxTrailLength;
          const pos = trail.positions[posIndex];
          if (pos) {
            if (i === 0) {
              ctx.moveTo(pos.x, pos.y);
            } else {
              ctx.lineTo(pos.x, pos.y);
            }
          }
        }
        ctx.stroke();
      }
    });

    // Render satellite points (only for visible satellites)
    pg.stroke('white');
    pg.strokeWeight(2);
    visibleSatellites.forEach((satellite) => {
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
    masses = createSinglePlanet();
    
    // Initialize with many satellites in orbit
    for (let i = 0; i < initialSatelliteCount; i += 1) {
      spawnSatelliteInOrbit(masses[0]);
    }
  };

  p.draw = () => {
    if (satellites.length < maxSatellites && p.random() < spawnProbability) {
      spawnSatelliteInOrbit(masses[0]);
    }

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
