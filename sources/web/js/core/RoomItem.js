/**
 * RoomItem - VisualEntity that can be stored in inventory or placed inside
 * scene.
 */

RoomItem.prototype = new Item();
RoomItem.prototype.constructor = RoomItem;

/**
 * @constructor
 */
function RoomItem() {
	RoomItem.parent.constructor.call(this);
};

RoomItem.inheritsFrom(Item);
RoomItem.prototype.className = "RoomItem";

RoomItem.prototype.createInstance = function(params) {
	var entity = new RoomItem();
	entity.init(params);
	return entity;
};

entityFactory.addClass(RoomItem);

RoomItem.prototype.init = function(params) {
	RoomItem.parent.init.call(this, params);
	this.params = params;
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.forSale = selectValue(params['forSale'], false);
	this.price = selectValue(params['price'], this.description['price'], 1);
};

RoomItem.prototype.createVisual = function() {
	RoomItem.parent.createVisual.call(this);
	var that = this;
	var moneySmallImage;
	this.moneyBigImage;
	if (this.description['money'] == "premium") {
		moneySmallImage = "shop/PremiumMoneyDiamond.png";
		this.moneyBigImage = "images/IconPremiumMoney.png";
	} else {
		moneySmallImage = "shop/GameMoneyCoin.png";
		this.moneyBigImage = "images/IconGameMoney.png";
	}

	if (this.forSale == true) {
		visual = guiFactory.createObject("GuiButton", {
			parent : that.guiParent,
			style : "sprite",
			width : 79,
			height : 24,
			normal : {
				background : [ {
					"image" : "shop/MarketFieldPrice.png",
					"width" : 79,
					"height" : 24
				}, {
					"image" : moneySmallImage,
					"width" : 15,
					"height" : 16,
					"x" : 5,
					"y" : 5
				} ]

//				"label" : {
//					"style" : "gameButton pusab-blue",
//					"text" : that.description['price'],
//					"fontSize" : 15,
//					"scale" : 100,
//					"color" : "#01B5FF",
//					"x" : 28,
//					"y" : 12
//				}
			},
			x : that.params['x']  - 39,
			y : that.params['y'] + that.description['height']
		});
		visualInfo = {};
		visual.clampByParentViewport();
		visualInfo.visual = visual;
		visualInfo.z = this.description['z-index'];
		this.addVisual(1, visualInfo);
	}
};

RoomItem.prototype.addSaleCallback = function() {
	var that = this;
	this
			.getVisual()
			.bind(
					function() {
						var subMoney = (that.description['money'] == "game") ? "money"
								: "premiumMoney";
						var dialog = {
							type : "buy",
							text : "Would you like to buy this?",
							price : that.price,
							max : Math.floor(Account.instance[subMoney]
									/ that.price),
							icons : {
								"iconFront" : {
									"background" : {
										"image" : "images/"
												+ that.description['totalImage'],
									},
									"width" : that.description['totalImageWidth']
											* (100 / that.description['totalImageHeight']),
									"height" : 100
								},
								"iconMoney" : {
									"background" : {
										"image" : that.moneyBigImage
									}
								}
							},
							callbacks : {
								v : function(dialog1) {
									// TODO: add item to inventory and subtract

									/*
									 * for ( var i = 1; i <= dialog1.result;
									 * i++) { Account.instance.inventory
									 * .addItem(that); }
									 */
									Account.instance[subMoney] -= dialog1.price
											* dialog1.result;
									Account.instance.children[Account.instance.children.length - 1]
											.getGui(
													that.description['money']
															+ "MoneySign")
											.change(Account.instance[subMoney]);

									// var item =
									// entityFactory.createObject("Item",
									// that.params);
									Account.instance.commandToServer("buyItem",
											[ that.params['description'],
													dialog1.result ], function(
													success) {
												if (success) {
													console.log("SUCCESS");
												} else {
													console.log("FAIL");
												}
											});
									// money
								},
								x : function(dialog1) {
									console.log("callback added and executed");
									// TODO: just close buyDialog
								},
								plus : function(dialog1) {
									console.log("plused");
									// TODO: check max count of items could be
									// bought
								},
								minus : function(dialog1) {
									console.log("minused");
								}
							}
						};
						Account.instance.showDialog(dialog);
					});
};
