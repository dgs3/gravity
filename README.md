# fxhash Template
Template git repo that includes boilerplate for projects.

We use fxhash to seed P5's randomness. To keep repeatability with the random
seed, use P5's random functions. Do not use platform (i.e. Math.random), since
that'll use a different seed.

Includes:

    * project infra (i.e. Makefile, common deps)
    * Dimensionless sketch skeleton built with p5
