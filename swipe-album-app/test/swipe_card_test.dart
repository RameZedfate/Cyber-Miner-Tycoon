import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:swipe_album/logic/swipe_logic.dart';
import 'package:swipe_album/ui/widgets/swipe_card.dart';

void main() {
  late List<SwipeDir> swiped;
  late GlobalKey<SwipeCardState> key;

  Future<void> pumpCard(WidgetTester tester) async {
    swiped = <SwipeDir>[];
    key = GlobalKey<SwipeCardState>();
    await tester.pumpWidget(MaterialApp(
      home: Center(
        child: SizedBox(
          width: 400,
          height: 600,
          child: SwipeCard(
            key: key,
            onSwiped: swiped.add,
            labelBuilder: (SwipeDir dir, double strength) =>
                Text('label:${dir.name}', key: const Key('label')),
            child: const ColoredBox(color: Colors.blue, key: Key('card')),
          ),
        ),
      ),
    ));
  }

  testWidgets('dragging far to the right commits a right swipe', (WidgetTester tester) async {
    await pumpCard(tester);
    await tester.drag(find.byKey(const Key('card')), const Offset(220, 0));
    await tester.pumpAndSettle();
    expect(swiped, <SwipeDir>[SwipeDir.right]);
  });

  testWidgets('dragging up commits "maybe" direction', (WidgetTester tester) async {
    await pumpCard(tester);
    await tester.drag(find.byKey(const Key('card')), const Offset(0, -200));
    await tester.pumpAndSettle();
    expect(swiped, <SwipeDir>[SwipeDir.up]);
  });

  testWidgets('a short, slow drag springs back without a swipe', (WidgetTester tester) async {
    await pumpCard(tester);
    final TestGesture g =
        await tester.startGesture(tester.getCenter(find.byKey(const Key('card'))));
    for (int i = 0; i < 10; i++) {
      await g.moveBy(const Offset(4, 0));
      await tester.pump(const Duration(milliseconds: 50));
    }
    await g.up();
    await tester.pumpAndSettle();
    expect(swiped, isEmpty);
  });

  testWidgets('label appears while dragging', (WidgetTester tester) async {
    await pumpCard(tester);
    final TestGesture g =
        await tester.startGesture(tester.getCenter(find.byKey(const Key('card'))));
    await g.moveBy(const Offset(-60, 0));
    await tester.pump();
    expect(find.text('label:left'), findsOneWidget);
    await g.up();
    await tester.pumpAndSettle();
  });

  testWidgets('fling() from a button triggers exactly one swipe', (WidgetTester tester) async {
    await pumpCard(tester);
    key.currentState!.fling(SwipeDir.left);
    key.currentState!.fling(SwipeDir.right); // ignored: already committed
    await tester.pumpAndSettle();
    expect(swiped, <SwipeDir>[SwipeDir.left]);
  });
}
