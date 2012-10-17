$(function(){
	// Set up basic options for the cart fancybox
	var fancyCartOptions = {
		maxWidth	: 940,
		maxHeight	: 570,
		fitToView	: false,
		width		: '100%',
		height		: '100%',
		autoSize	: true,
		closeClick	: false,
		topRatio	: 0,
		openEffect	: 'none',
		closeEffect	: 'none',
		type        : 'ajax',
		padding		: 5
	};
	
	var fancyProductOptionsOptions = {
		maxWidth    : 180,
		fitToView	: false,
		width		: '100%',
		height		: '100%',
		autoSize	: true,
		closeClick	: false,
		openEffect	: 'none',
		closeEffect	: 'none'
	};
	
	function toMMSS(totalSeconds) {
		var date = new Date(totalSeconds * 1000);
		var mm = date.getMinutes();
		var ss = date.getSeconds();
		if (ss < 10) {
			ss = "0" + ss;
		}
		
	    return mm + ":" + ss;
	}
	
	function checkExpiration() {
		var count = $('#expiresSeconds').text();
		$("#expiresTime").text(toMMSS(count));
		
		expiryTimer = setInterval(function() {
			var count = $('#expiresSeconds').text();
			count--;
			
			
			if (count >= 0) {
				$('#expiresSeconds').text(count);
				$("#expiresTime").text(toMMSS(count));
			} else {
				BLC.ajax({url: '/cart/checkExpiration',
						type: "GET",
						dataType: "json"
					}, function(data, extraData) {
						if (data.secondsUntilExpiration <= 0) {
							clearInterval(expiryTimer);
							$("#expiredMessage").removeClass("hidden");
							$("#countdownMessage").addClass("hidden");
							updateHeaderCartItemsCount(data.cartItemCount);
							showAddToCartButton(1, 'cart');
							showAddToCartButton(2, 'cart');
						}
					}
				);
			}
		}, 1000);
	}
	
	function refreshExpiration() {
		clearInterval(expiryTimer);
		BLC.ajax({url: '/cart/checkExpiration',
				type: "GET",
				dataType: "json"
			}, function(data, extraData) {
				$('#expiresSeconds').text(data.secondsUntilExpiration);
				$("#expiredMessage").addClass("hidden");
				$("#countdownMessage").removeClass("hidden");
				checkExpiration();
			}
		);
	}
	
	$(function() {
		checkExpiration();
	});
	
	// This will change the header "X item(s)" text to the new count and
	// pluralization of "item"
	function updateHeaderCartItemsCount(newCount) {

        //Pull the word that was set in the html from the internationalized version from the locale
        var singularItem = $('span#headerCartItemWordSingluar_i18n').text();
        var plurarlItem = $('span#headerCartItemWordPlural_i18n').text();

		$('.headerCartItemsCount').html(newCount);
		$('.headerCartItemsCountWord').html((newCount == 1) ? singularItem: plurarlItem);
	}
	
	function updateWithPromo(promo) {
		$('.headerCartItemCount').html();
	}
	
	// Hides the add to cart/add to wishlist button and shows the in cart/in wishlist button
    // orderType can either be 'cart' or 'wishlist'
	function showInCartButton(productId, orderType) {
		$('.productActions' + productId).children('.in_'+orderType).removeClass('hidden');
		$('.productActions' + productId).children('.add_to_'+orderType).addClass('hidden');
	}
	
	// Hides the in cart/in wishlist button and shows the add to cart/add to wishlist button
    // orderType can either be 'cart' or 'wishlist'
	function showAddToCartButton(productId, orderType) {
		$('.productActions' + productId).children('.add_to_'+orderType).removeClass('hidden');
		$('.productActions' + productId).children('.in_'+orderType).addClass('hidden');
	}

	// Show the cart in a modal when any link with the class "fancycart" is clicked
	$('body').on('click', 'a.fancycart', function() {
		var extendedOptions = $.extend({ href : $(this).attr('href') }, fancyCartOptions);
		
		if ($(this).hasClass('refreshonclose')) {
			extendedOptions = $.extend({ afterClose: function() { window.location.reload(); }}, extendedOptions);
		}
		
		$.fancybox.open(extendedOptions);
		return false;
	});
	
	// Intercept add to cart operations and perform them via AJAX instead
	// This will trigger on any input with class "addToCart" or "addToWishlist"
	$('body').on('click', 'input.addToCart,input.addToWishlist', function() {
		var $button = $(this),
			$container = $button.closest('.product_container'),
			$form = $button.closest('form'),
			$options = $container.find('span.option-value'),
			$errorSpan = $container.find('span.error');
		
		if ($container.length == 0) {
			var myId = $button.parent().attr('id').substring('productOptions'.length);
			$container = $('.productActions' + myId).closest('.product_container');
			$form = $container.find('form');
			$options = $button.parent().find('span.option-value');
			$errorSpan = $button.parent().find('span.error');
		}
		
		var itemRequest = BLC.serializeObject($form),
			modalClick = $button.parents('.fancybox-inner').length > 0,
			wishlistAdd = $button.hasClass('addToWishlist');
			
		if (itemRequest.hasProductOptions == "true" && !modalClick) {
			$.fancybox.open($.extend({ href : '#productOptions' + itemRequest.productId}, fancyProductOptionsOptions));
		} else {
			$options.each(function(index, element) {
				itemRequest['itemAttributes[' + $(element).attr('id') + ']'] = $(element).text();
			});
			
			BLC.ajax({url: $form.attr('action'), 
					type: "POST",
					dataType: "json",
					data: itemRequest
				}, function(data, extraData) {
					if (data.error) {
						if (data.error == 'allOptionsRequired') {
							$errorSpan.css('display', 'block');
					        $errorSpan.effect('highlight', {}, 1000);
						} else if (data.error == 'inventoryUnavailable') {
                            var $errorMessage = $('.error.errorMessage');
                            var message = 'This item is no longer in stock. We apologize for the inconvenience.';
                            $errorMessage.text(message).show().effect('highlight', {}, 1000);
                            HC.showNotification(message);
                        } else {
							HC.showNotification("Error adding to cart");
						}
					} else {
						$errorSpan.css('display', 'none'); 
						updateHeaderCartItemsCount(data.cartItemCount);
						
						if (modalClick) {
							$.fancybox.close();
						} else if (wishlistAdd) {
                            showInCartButton(data.productId, 'wishlist');
						} else {
							showInCartButton(data.productId, 'cart');
						}
						
						if (wishlistAdd) {
							HC.showNotification(data.productName + "  has been added to your wishlist!");
						} else {
							HC.showNotification(data.productName + "  has been added to the cart!", 2000);
						}
						
						refreshExpiration();
						$('#headerExpires').removeClass('hidden');
					}
				}
			);
		}
		return false;
	});

    // Intercept update quantity operations and perform them via AJAX instead
	// This will trigger on any input with class "updateQuantity"
	$('body').on('click', 'input.updateQuantity', function() {
		var $form = $(this).closest('form');
		
		BLC.ajax({url: $form.attr('action'),
				type: "POST", 
				data: $form.serialize() 
			}, function(data, extraData) {
				if (extraData) {
                    updateHeaderCartItemsCount(extraData.cartItemCount);
                    if ($form.children('input.quantityInput').val() == 0) {
                        showAddToCartButton(extraData.productId, 'cart');
                    }
                }

				refreshExpiration();
				$('.fancybox-inner').html(data);
			}
		);
		return false;
	});
	
	// Intercept remove from cart operations and perform them via AJAX instead
	// This will trigger on any link with class "remove_from_cart"
	$('body').on('click', 'a.remove_from_cart', function() {
		var link = this;
		
		BLC.ajax({url: $(link).attr('href'),
				type: "GET"
			}, function(data, extraData) {
				updateHeaderCartItemsCount(extraData.cartItemCount);
				showAddToCartButton(extraData.productId, 'cart');
				
				refreshExpiration();
				$('.fancybox-inner').html(data);
			}
		);
		return false;
	});
	
	// Intercept remove from cart operations and perform them via AJAX instead
	// This will trigger on any link with class "remove_from_cart"
	$('body').on('click', 'a.remove_promo', function() {
		var link = this;
		
		BLC.ajax({url: $(link).attr('href'),
				type: "GET"
			}, function(data) {
				$('.fancybox-inner').html(data);
			}
		);
		return false;
	});
	
	$('body').on('click', 'input#addPromo', function() {
		var $form = $(this).closest('form');
		
		BLC.ajax({url: $form.attr('action'),
				type: "POST", 
				data: $form.serialize() 
			}, function(data, extraData) {
				if(!extraData.promoAdded) {
					$("#cart_promo_error").html("Promo could not be applied: " + extraData.exception).css("display", "");
				} else {
					$('.fancybox-inner').html(data);
				}
			}
		);
		return false;
	});
});