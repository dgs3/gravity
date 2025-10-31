# fxhash Template
Template git repo that includes boilerplate for projects.

We use fxhash to seed P5's randomness. To keep repeatability with the random
seed, use P5's random functions. Do not use platform (i.e. Math.random), since
that'll use a different seed.

Includes:

    * project infra (i.e. Makefile, common deps)
    * Dimensionless sketch skeleton built with p5
    * fxhash and p5 libs in the src tree. fxhash packaging requires libs be
      installed directly into source.

# How to install new libs
Overall, try not to install new libs, since they take up space which is
expensive when installed on chain. Use `npx fxhash add --list` to see which
libs are available on chain already; try to stick to those.
