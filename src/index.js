const sketch = (p) => {
  const fixedSize = 1000;
  const spawnProbability = 0.5;
  const laneMinMultiplier = 1.1;
  const laneMaxMultiplier = 2.0;
  const laneCountMin = 30;
  const laneCountMax = 80;
  const laneMinRadiusMin = 1.1;
  const laneMinRadiusMax = 1.2;
  const laneMaxRadiusMin = 1.5; // Minimum multiplier for max lane distance
  const laneMaxRadiusMax = 2.0; // Maximum multiplier for max lane distance
  const laneDeltaMin = 0; // Random delta for messiness
  const laneDeltaMax = 5;
  const planetRotationSpeed = 0.00001; // Rotation speed per second (radians)
  let scaleUnit;
  let pg;

  const G = 1;
  const satelliteMass = .25;
  const dt = 0.01;
  const stepsPerFrame = 25;
  const numSatellitesRange = 200
  const maxSatellites = 800 + Math.floor(p.random(numSatellitesRange));
  const initialSatelliteCount = 200;
  const maxTrailLength = 500; // Maximum number of positions to store in satellite trail
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

    return {x: ax, y: ay};
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
      position: {x: positionX, y: positionY},
      rotation: 0, // Initial rotation angle
    };
    
    // Generate orbital lanes
    // 1. Randomly generate the number of lanes
    const numLanes = Math.floor(p.random(laneCountMin, laneCountMax));
    
    // 2. Randomly decide the first lane distance
    const minRadius = planet.radius * p.random(laneMinRadiusMin, laneMinRadiusMax);
    
    // 3. Randomly decide the max lane distance
    const maxRadius = planet.radius * p.random(laneMaxRadiusMin, laneMaxRadiusMax);
    
    // 4. Divide the total distance by the number of lanes to get spacing
    const totalDistance = maxRadius - minRadius;
    const spacing = numLanes > 1 ? totalDistance / (numLanes - 1) : 0;
    
    // 5. Generate lanes with evenly spaced positions plus random delta for messiness
    const lanes = [];
    for (let i = 0; i < numLanes; i += 1) {
      const baseDistance = minRadius + (i * spacing);
      const delta = p.random(laneDeltaMin, laneDeltaMax);
      lanes.push(baseDistance + delta);
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
    const spawnPosition = {
      x: planet.position.x + Math.cos(angle) * orbitalDistance,
      y: planet.position.y + Math.sin(angle) * orbitalDistance
    };
    
    // Calculate circular orbit velocity
    const baseSpeed = Math.sqrt((G * planet.mass) / orbitalDistance);
    
    // Tangential direction perpendicular to radius vector
    const dx = planet.position.x - spawnPosition.x;
    const dy = planet.position.y - spawnPosition.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const vectorToPlanet = {x: dx / dist, y: dy / dist};
    
    // Choose random tangential direction (clockwise or counterclockwise)
    // Rotate 90 degrees: (x, y) -> (-y, x) or (y, -x)
    const tangentialDirection = laneIndex % 2 === 0 
      ? {x: -vectorToPlanet.y, y: vectorToPlanet.x}
      : {x: vectorToPlanet.y, y: -vectorToPlanet.x};
    
    const orbitalVelocity = {
      x: tangentialDirection.x * baseSpeed,
      y: tangentialDirection.y * baseSpeed
    };
    
    // Create satellite with orbital velocity
    const satellite = {
      mass: satelliteMass,
      position: {x: spawnPosition.x, y: spawnPosition.y},
      velocity: orbitalVelocity,
      trail: {
        positions: new Array(maxTrailLength), // Don't pre-initialize
        index: 1, // Points to next write position
        length: 1, // One position has been written
      },
    };
    // Initialize first trail position
    satellite.trail.positions[0] = {x: spawnPosition.x, y: spawnPosition.y};
    
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
        // Update position using direct math
        satellite.position.x += satellite.velocity.x * dt + satellite.acceleration.x * 0.5 * dt * dt;
        satellite.position.y += satellite.velocity.y * dt + satellite.acceleration.y * 0.5 * dt * dt;

        const newAcceleration = computeAcceleration(satellite);
        
        // Update velocity using direct math
        satellite.velocity.x += (satellite.acceleration.x + newAcceleration.x) * 0.5 * dt;
        satellite.velocity.y += (satellite.acceleration.y + newAcceleration.y) * 0.5 * dt;

        satellite.acceleration = newAcceleration;
      });
      
      // Update planet rotation smoothly (updated each physics step)
      masses.forEach((planet) => {
        planet.rotation += planetRotationSpeed * dt;
      });
    }
    // Update trails every N frames (after all physics steps)
    if (p.frameCount % trailUpdateFrequency === 0) {
      satellites.forEach((satellite) => {
        const trail = satellite.trail;
        // Write to current index
        trail.positions[trail.index] = {x: satellite.position.x, y: satellite.position.y};
        
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
    pg.rotate(body.rotation); // Apply rotation
    
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
    
    // Draw planet circumference with stroke
    pg.noFill();
    pg.stroke(50, 50, 50); // White stroke
    pg.strokeWeight(1.5);
    pg.ellipse(0, 0, radius * 2, radius * 2);
    
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
