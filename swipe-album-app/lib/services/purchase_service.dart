import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../config.dart';

/// One-time USD 5 "remove ads forever" purchase (non-consumable).
/// The price itself is set in App Store Connect / Google Play Console;
/// the store returns the localised price string we show on the button.
class PurchaseService extends ChangeNotifier {
  PurchaseService({required this.onEntitlement});

  /// Called with true when the user owns the product (bought or restored).
  final void Function(bool owned) onEntitlement;

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _sub;

  bool available = false;
  bool busy = false;
  ProductDetails? product;
  String? lastError;

  Future<void> init() async {
    _sub = _iap.purchaseStream.listen(_onPurchases, onError: (Object e) {
      lastError = '$e';
      busy = false;
      notifyListeners();
    });
    available = await _iap.isAvailable();
    if (available) {
      final ProductDetailsResponse res =
          await _iap.queryProductDetails(<String>{AppConfig.removeAdsProductId});
      if (res.productDetails.isNotEmpty) product = res.productDetails.first;
    }
    notifyListeners();
  }

  /// Price as shown by the store, e.g. "US$4.99" or "NT$150".
  String? get priceLabel => product?.price;

  Future<void> buy() async {
    final ProductDetails? p = product;
    if (p == null || busy) return;
    busy = true;
    lastError = null;
    notifyListeners();
    final bool started =
        await _iap.buyNonConsumable(purchaseParam: PurchaseParam(productDetails: p));
    if (!started) {
      busy = false;
      notifyListeners();
    }
  }

  /// Required by App Store review for non-consumables.
  Future<void> restore() async {
    busy = true;
    lastError = null;
    notifyListeners();
    await _iap.restorePurchases();
    // Restored items arrive on the stream; stop the spinner either way.
    Future<void>.delayed(const Duration(seconds: 8), () {
      if (busy) {
        busy = false;
        notifyListeners();
      }
    });
  }

  Future<void> _onPurchases(List<PurchaseDetails> purchases) async {
    for (final PurchaseDetails p in purchases) {
      if (p.productID != AppConfig.removeAdsProductId) continue;
      switch (p.status) {
        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          onEntitlement(true);
          busy = false;
        case PurchaseStatus.error:
          lastError = p.error?.message;
          busy = false;
        case PurchaseStatus.canceled:
          busy = false;
        case PurchaseStatus.pending:
          break;
      }
      if (p.pendingCompletePurchase) await _iap.completePurchase(p);
    }
    notifyListeners();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
