//jshint esversion:6

PlayState = {};
let gameFinished = false;
let timerSet = false;
let seconds = 0;
const JUMP_SPEED = 600;
const BOUNCE_SPEED = 300;
let text1;
let text2;
let text3;
let helpStyle = {
  font: "13px Lucida Console",
  fill: "white",
  align: "center"
};
let style = {
  font: "60px Lucida Console",
  fill: "white",
  align: "center"
};

window.onload = function() {
  let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
  game.state.add('play', PlayState);
  game.state.start('play', true, false, {
    level: 1
  });
};

document.addEventListener("keydown", function(event) {
  if (event.which == 8) {
    event.preventDefault();
  }
});

function incrementSeconds() {
  if (gameFinished == false) {
    seconds += 1;
  }
}

function toggleSound() {
  if (PlayState.sound.mute == false) {
    PlayState.sound.mute = true;
  } else if (PlayState.sound.mute == true) {
    PlayState.sound.mute = false;
  }
}

PlayState.preload = function() {
  this.game.load.json('level:1', 'data/level01.json');
  this.game.load.json('level:2', 'data/level02.json');
  this.game.load.json('level:3', 'data/level03.json');
  this.game.load.json('level:4', 'data/level04.json');
  this.game.load.json('level:5', 'data/level05.json');

  this.game.load.image('background', 'images/background.png');
  this.game.load.image('ground', 'images/ground.png');
  this.game.load.image('grass:8x1', 'images/grass_8x1.png');
  this.game.load.image('grass:6x1', 'images/grass_6x1.png');
  this.game.load.image('grass:4x1', 'images/grass_4x1.png');
  this.game.load.image('grass:2x1', 'images/grass_2x1.png');
  this.game.load.image('grass:1x1', 'images/grass_1x1.png');
  this.game.load.image('invisible-wall', 'images/invisible_wall.png');
  this.game.load.image('font:numbers', 'images/numbers.png');
  this.game.load.image('key', 'images/key.png');
  this.game.load.image('blueberry', 'images/blueberry.png');

  this.game.load.audio('sfx:stomp', 'audio/stomp.wav');
  this.game.load.audio('sfx:key', 'audio/key.wav');
  this.game.load.audio('bgm', ['audio/bgm.mp3', 'audio/bgm.ogg']);

  this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
  this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
  this.game.load.spritesheet('snake', 'images/snake.png', 79, 74);
  this.game.load.spritesheet('icon:key', 'images/key_icon.png', 34, 30);
  this.game.load.spritesheet('door', 'images/door.png', 42, 66);
  this.game.load.spritesheet('decoration', 'images/decor.png', 42, 42);
};

PlayState.init = function(data) {
  this.game.renderer.renderSession.roundPixels = true;
  this.keys = this.game.input.keyboard.addKeys({
    left: Phaser.KeyCode.LEFT,
    right: Phaser.KeyCode.RIGHT,
    up: Phaser.KeyCode.UP,
    a: Phaser.KeyCode.A,
    d: Phaser.KeyCode.D,
    w: Phaser.KeyCode.W
  });
  this.level = data.level;
  this.hasKey = false;
  this.keySpawned = false;

  if (timerSet == false) {
    setInterval(incrementSeconds, 1000);
    timerSet = true;
  }
  this.time.desiredFps = 60;
};

PlayState.create = function() {
  this.sfx = {
    stomp: this.game.add.audio('sfx:stomp'),
    key: this.game.add.audio('sfx:key')
  };
  this.bgm = this.game.add.audio('bgm');
  this.bgm.loopFull();
  this.game.add.image(0, 0, 'background');
  let data = this.game.cache.getJSON(`level:${this.level}`);
  this.allCoins = data.berries.length;
  this._loadLevel(data);
  this._createHud();
};

PlayState._createHud = function() {
  this.hud = this.game.add.group();
  this.keyIcon = this.game.make.image(0, 19, 'icon:key');
  let coinIcon = this.game.make.image(
    this.keyIcon.width + 7, 0, 'blueberry');
  coinIcon.scale.setTo(0.4);
  const NUMBERS_STR = '0123456789X ';
  this.coinFont = this.game.add.retroFont(
    'font:numbers', 20, 26, NUMBERS_STR, 6);
  this.levelFont = this.game.add.retroFont(
    'font:numbers', 20, 26, NUMBERS_STR, 6);
  this.timerFont = this.game.add.retroFont(
    'font:numbers', 20, 26, NUMBERS_STR, 6);
  let coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
    coinIcon.height / 2, this.coinFont);
  let levelImg = this.game.make.image(900, 19, this.levelFont);
  this.keyIcon.anchor.set(0, 0.5);
  coinScoreImg.anchor.set(0, 0.5);
  levelImg.anchor.set(0, 0.5);
  this.hud.add(coinIcon);
  this.hud.add(coinScoreImg);
  this.hud.add(this.keyIcon);
  this.hud.add(levelImg);
  this.hud.position.set(10, 10);
};

PlayState._loadLevel = function(data) {
  this.platforms = this.game.add.group();
  this.berries = this.game.add.group();
  this.spiders = this.game.add.group();
  this.snakes = this.game.add.group();
  this.bgDecoration = this.game.add.group();
  this.enemyWalls = this.game.add.group();
  this.enemyWalls.visible = false;
  data.platforms.forEach(this._spawnPlatform, this);
  data.decoration.forEach(function(deco) {
    this.bgDecoration.add(
      this.game.add.image(deco.x, deco.y, 'decoration', deco.frame));
  }, this);
  this._spawnCharacters({
    hero: data.hero,
    spiders: data.spiders,
    snakes: data.snakes
  });
  this._spawnDoor(data.door.x, data.door.y);
  data.berries.forEach(this._spawnCoin, this);
  const GRAVITY = 1200;
  this.game.physics.arcade.gravity.y = GRAVITY;

  if (this.level == 5) {
    let text = this.add.text(
      480, 585, "BOSS TASE", {
        font: "30px Lucida Console",
        fill: "black"
      });
    text.anchor.set(0.5);
  }

  if (this.level == 1) {
    text1 = this.add.text(
      200, 35, "Korjamata\nmustikad", helpStyle);
    text1.anchor.set(0.5);
    text2 = this.add.text(
      507, 50, "Kulunud aeg", helpStyle);
    text2.anchor.set(0.5);
    text3 = this.add.text(
      875, 35, "Taseme\nnumber", helpStyle);
    text3.anchor.set(0.5);
  }
  if (this.level != 1) {
    document.getElementById("text", "nb").style.color = "gray";
    document.getElementById("soundButton").style.border = "2px solid gray";
  }

};

PlayState._spawnPlatform = function(platform) {
  let sprite = this.platforms.create(
    platform.x, platform.y, platform.image);
  this.game.add.sprite(platform.x, platform.y, platform.image);
  this.game.physics.enable(sprite);
  sprite.body.allowGravity = false;
  sprite.body.immovable = true;
  this._spawnEnemyWall(platform.x, platform.y, 'left');
  this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function(x, y, side) {
  let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
  sprite.anchor.set(side === 'left' ? 1 : 0, 1);
  this.game.physics.enable(sprite);
  sprite.body.immovable = true;
  sprite.body.allowGravity = false;
};

PlayState._spawnCharacters = function(data) {
  this.hero = new Hero(this.game, data.hero.x, data.hero.y);
  this.game.add.existing(this.hero);
  data.spiders.forEach(function(spider) {
    let sprite = new Spider(this.game, spider.x, spider.y);
    this.spiders.add(sprite);
  }, this);
  data.snakes.forEach(function(snake) {
    let sprite = new Snake(this.game, snake.x, snake.y);
    this.snakes.add(sprite);
  }, this);
};

PlayState._spawnCoin = function(berry) {
  let sprite = this.berries.create(berry.x, berry.y, 'blueberry');
  sprite.scale.setTo(0.3);
  sprite.anchor.set(0.3, 0.3);
  this.game.physics.enable(sprite);
  sprite.body.allowGravity = false;
};

PlayState._spawnKey = function(x, y) {
  this.key = this.bgDecoration.create(x, y, 'key');
  this.key.anchor.set(0.5, 0.5);
  this.game.physics.enable(this.key);
  this.key.body.allowGravity = false;
  this.game.add.tween(this.key).from({
      y: -10
    },
    2000, Phaser.Easing.Bounce.Out, true);
};

PlayState._spawnDoor = function(x, y) {
  this.door = this.bgDecoration.create(x, y, 'door');
  this.door.anchor.setTo(0.5, 1);
  this.game.physics.enable(this.door);
  this.door.body.allowGravity = false;
};

function Hero(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'hero');
  this.anchor.set(0.5, 0.5);
  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.animations.add('stop', [0]);
  this.animations.add('run', [1, 2], 8, true);
  this.animations.add('jump', [3]);
  this.animations.add('fall', [4]);
  this.animations.add('die', [5, 6], 8, true);

}

function Spider(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'spider');
  this.anchor.set(0.5);
  this.animations.add('crawl', [0, 1, 2], 8, true);
  this.animations.play('crawl');
  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.body.velocity.x = Spider.SPEED;
  this.scale.x *= -1;
}
Spider.SPEED = 130;

function Snake(game, x, y) {
  Phaser.Sprite.call(this, game, x, y, 'snake');
  this.anchor.set(0.5);
  if (PlayState.level == 5) {
    this.animations.add(
      'crawl', [29, 29, 30, 31, 32, 33, 34, 35], 10, true);
  } else {
    this.animations.add(
      'crawl', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10, true);
  }
  this.animations.play('crawl');
  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.body.velocity.x = Snake.SPEED;
}
Snake.SPEED = 150;

Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;

Snake.prototype = Object.create(Phaser.Sprite.prototype);
Snake.prototype.constructor = Snake;

Hero.prototype.move = function(direction) {
  this.x += direction * 2.5;
  const SPEED = 130;
  this.body.velocity.x = direction * SPEED;

  if (this.body.velocity.x < 0) {
    this.scale.x = -1;
  } else if (this.body.velocity.x > 0) {
    this.scale.x = 1;
  }
};

Hero.prototype.jump = function() {
  if (this.body.touching.down) {
    this.body.velocity.y = -JUMP_SPEED;
  }
};

Hero.prototype.bounce = function() {
  this.body.velocity.y = -BOUNCE_SPEED;
};

Hero.prototype.update = function() {
  let animationName = this._getAnimationName();
  if (this.animations.name !== animationName) {
    this.animations.play(animationName);
  }
};

Hero.prototype._getAnimationName = function() {
  let name = 'stop';

  if (!this.alive) {
    name = 'die';
  }

  if (this.body.velocity.y < 0) {
    name = 'jump';
  } else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
    name = 'fall';
  } else if (this.body.velocity.x !== 0 && this.body.touching.down) {
    name = 'run';
  }
  return name;
};

Spider.prototype.update = function() {
  if (this.body.touching.right || this.body.blocked.right) {
    this.body.velocity.x = -Spider.SPEED;
    this.scale.x *= -1;
  } else if (this.body.touching.left || this.body.blocked.left) {
    this.body.velocity.x = Spider.SPEED;
    this.scale.x *= -1;
  }
};

Snake.prototype.update = function() {
  if (this.body.touching.right || this.body.blocked.right) {
    this.body.velocity.x = -Snake.SPEED;
    this.scale.x *= -1;
  } else if (this.body.touching.left || this.body.blocked.left) {
    this.body.velocity.x = Snake.SPEED;
    this.scale.x *= -1;
  }
};

Spider.prototype.die = function() {
  this.animations.add('die', [1, 2], 3, true);
  this.animations.play('die');
  this.body.enable = false;
};

Snake.prototype.die = function() {
  if (PlayState.level == 5) {
    this.animations.add('die', [30]);
  } else {
    this.animations.add('die', [7]);
  }
  this.animations.play('die');
  this.body.enable = false;
};

Hero.prototype.die = function() {
  this.alive = false;
  this.body.enable = false;

  this.animations.play('die').onComplete.addOnce(function() {
    this.kill();
  }, this);
};

PlayState.update = function() {
  this._handleCollisions();
  this._handleInput();

  this.keys.up.onDown.add(function() {
    this.hero.jump();
  }, this);
  this.keys.w.onDown.add(function() {
    this.hero.jump();
  }, this);

  this.coinFont.text = `x${this.allCoins}`;
  this.levelFont.text = `${this.level}`;
  this.timerFont.text = `${seconds}`;
  this.keyIcon.frame = this.hasKey ? 1 : 0;

  if (this.allCoins == 0 && this.keySpawned == false) {
    this.keySpawned = true;
    let data = this.game.cache.getJSON(`level:${this.level}`);
    this._spawnKey(data.key.x, data.key.y);
  }
  let timerImg = this.game.make.image(480, -5, this.timerFont);
  this.hud.add(timerImg);
  if (seconds > 9) {
    text1.text = "";
    text2.text = "";
    text3.text = "";
  }
};

PlayState.shutdown = function() {
  this.bgm.stop();
};

PlayState._handleInput = function() {
  if (this.keys.left.isDown || this.keys.a.isDown) {
    this.hero.move(-1);
  } else if (this.keys.right.isDown || this.keys.d.isDown) {
    this.hero.move(1);
  } else {
    this.hero.move(0);
  }
};

PlayState._handleCollisions = function() {
  this.game.physics.arcade.collide(this.hero, this.platforms);
  this.game.physics.arcade.collide(this.spiders, this.platforms);
  this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
  this.game.physics.arcade.collide(this.snakes, this.platforms);
  this.game.physics.arcade.collide(this.snakes, this.enemyWalls);
  this.game.physics.arcade.overlap(this.hero, this.berries,
    this._onHeroVsCoin, null, this);
  this.game.physics.arcade.overlap(this.hero, this.spiders,
    this._onHeroVsEnemy, null, this);
  this.game.physics.arcade.overlap(this.hero, this.snakes,
    this._onHeroVsEnemy, null, this);
  this.game.physics.arcade.overlap(this.hero, this.key,
    this._onHeroVsKey, null, this);
  this.game.physics.arcade.overlap(this.hero, this.door,
    this._onHeroVsDoor,
    function(hero, door) {
      return this.hasKey && hero.body.touching.down;
    }, this);
};

PlayState._onHeroVsCoin = function(hero, berry) {
  berry.kill();
  this.allCoins--;
};

PlayState._onHeroVsEnemy = function(hero, enemy) {
  if (gameFinished == false) {
    this.sfx.stomp.play();
    enemy.die();
    hero.die();
    this.camera.shake(0.01, 400);
    this.camera.fade('#000000', 1000);
    let text = this.add.text(
      this.world.centerX, this.world.centerY, "Surid", style);
    text.anchor.set(0.5);
    this.camera.onFadeComplete.addOnce(function() {
      this.game.state.restart(true, false, {
        level: this.level
      });
    }, this);
  }
};

PlayState._onHeroVsKey = function(hero, key) {
  this.sfx.key.play();
  key.kill();
  this.hasKey = true;
};

PlayState._onHeroVsDoor = function(hero, door) {
  door.frame = 1;
  if (this.level == 5) {
    gameFinished = true;
    if (seconds < 120) {
      let text = this.add.text(
        this.world.centerX, this.world.centerY,
        `Oled selles mängus maailma parim! PALJU ÕNNE!\nAeg: ${Math.floor(
         seconds/60)} min, ${seconds-Math.floor(seconds/60)*60} s`, style);
    } else {
      let text = this.add.text(
        this.world.centerX, this.world.centerY,
        `Võitsid! Palju õnne!\nAeg: ${Math.floor(
       seconds/60)} min, ${seconds-Math.floor(seconds/60)*60} s`, style);
    }
    text.anchor.set(0.5);
    this.camera.fade('#000000', 20000);
    this.camera.onFadeComplete.addOnce(function() {
      this.destroy();
    }, this);
  } else {
    this.camera.fade('#000000', 500);
    this.camera.onFadeComplete.addOnce(function() {
      this.game.state.restart(true, false, {
        level: this.level + 1
      });
    }, this);
  }
};
