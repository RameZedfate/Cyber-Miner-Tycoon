import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:photo_manager/photo_manager.dart';

import '../app_scope.dart';
import '../config.dart';
import '../l10n/strings.dart';
import '../logic/achievements.dart';
import '../logic/formatters.dart';
import '../state/app_state.dart';
import 'maybe_page.dart';
import 'recap_page.dart';
import 'settings_page.dart';
import 'similar_page.dart';
import 'swipe_page.dart';
import 'trash_page.dart';
import 'widgets/asset_thumb.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key, this.onPickMore});

  /// Set when iOS/Android granted access to selected photos only.
  final VoidCallback? onPickMore;

  @override
  Widget build(BuildContext context) {
    final AppServices s = AppScope.of(context);
    final S t = S.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(t.appName, style: const TextStyle(fontWeight: FontWeight.w800)),
        actions: <Widget>[
          IconButton(
            tooltip: t.recapTitle,
            icon: const Icon(Icons.auto_awesome),
            onPressed: () => _push(context, const RecapPage()),
          ),
          IconButton(
            tooltip: t.settingsTitle,
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => _push(context, const SettingsPage()),
          ),
        ],
      ),
      body: ListenableBuilder(
        listenable: Listenable.merge(<Listenable>[s.state, s.library]),
        builder: (BuildContext context, _) => RefreshIndicator(
          onRefresh: () async {
            await s.library.load();
            s.state.pruneMissing(s.library.byId.keys.toSet());
          },
          child: _HomeBody(services: s, onPickMore: onPickMore),
        ),
      ),
    );
  }
}

Future<void> _push(BuildContext context, Widget page) =>
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));

Future<void> _openDeck(BuildContext context, String title, List<AssetEntity> assets,
        {MonthKey? month}) =>
    _push(context, SwipePage(title: title, assets: assets, month: month));

class _HomeBody extends StatelessWidget {
  const _HomeBody({required this.services, this.onPickMore});
  final AppServices services;
  final VoidCallback? onPickMore;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final AppState state = services.state;
    final int pending = state.countWith(Decision.pendingDelete);
    final int maybe = state.countWith(Decision.maybe);
    final List<AssetEntity> onThisDay = services.library.onThisDay(DateTime.now());

    if (services.library.all.isEmpty && !services.library.loading) {
      return ListView(children: <Widget>[
        const SizedBox(height: 120),
        Center(child: Text(t.libraryEmpty)),
      ]);
    }

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: <Widget>[
        if (onPickMore != null)
          _Banner(
            color: Colors.blue,
            icon: Icons.photo_library_outlined,
            text: t.limitedNote,
            action: t.pickMore,
            onTap: onPickMore!,
          ),
        _StatsHeader(state: state),
        if (pending > 0)
          _Banner(
            color: Colors.red,
            icon: Icons.delete_outline,
            text: t.pendingBanner(pending),
            action: t.pendingAction,
            onTap: () => _push(context, const TrashPage()),
          ),
        if (maybe > 0)
          _Banner(
            color: Colors.amber.shade800,
            icon: Icons.help_outline,
            text: t.maybeBanner(maybe),
            action: t.maybeAction,
            onTap: () => _push(context, const MaybePage()),
          ),
        if (onThisDay.isNotEmpty) _OnThisDayCard(assets: onThisDay),
        _SectionTitle(t.quickClean),
        _QuickGrid(services: services),
        _SectionTitle(t.byMonth),
        for (final MonthKey m in services.library.months)
          _MonthTile(month: m, assets: services.library.byMonth[m]!, state: state),
        _SectionTitle(t.achievementsTitle),
        _Achievements(unlocked: state.achievements),
      ],
    );
  }
}

class _StatsHeader extends StatelessWidget {
  const _StatsHeader({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final ColorScheme cs = Theme.of(context).colorScheme;
    final double progress = math.min(1.0, state.todaySwipes / state.dailyGoal);
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: <Widget>[
          SizedBox(
            width: 76,
            height: 76,
            child: Stack(fit: StackFit.expand, children: <Widget>[
              CircularProgressIndicator(
                value: progress,
                strokeWidth: 8,
                backgroundColor: cs.surfaceContainerHighest,
              ),
              Center(
                child: Text('${state.todaySwipes}\n/${state.dailyGoal}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold, height: 1.1)),
              ),
            ]),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
              Text(t.todayGoal, style: Theme.of(context).textTheme.labelLarge),
              const SizedBox(height: 4),
              Text('🔥 ${t.streakDays(state.streak)}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Text('${t.freed} ${formatBytes(state.bytesFreed)} · '
                  '${t.deletedLabel} ${state.deletedCount}'),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({
    required this.color,
    required this.icon,
    required this.text,
    required this.action,
    required this.onTap,
  });

  final Color color;
  final IconData icon;
  final String text;
  final String action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 0),
      color: color.withValues(alpha: 0.12),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(text),
        trailing: TextButton(onPressed: onTap, child: Text(action)),
        onTap: onTap,
      ),
    );
  }
}

class _OnThisDayCard extends StatelessWidget {
  const _OnThisDayCard({required this.assets});
  final List<AssetEntity> assets;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _openDeck(context, t.onThisDay, assets),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
            Text('📅 ${t.onThisDay}',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(t.onThisDayCount(assets.length),
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            SizedBox(
              height: 84,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: math.min(assets.length, 12),
                separatorBuilder: (_, _) => const SizedBox(width: 6),
                itemBuilder: (_, int i) => ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: SizedBox(width: 84, child: AssetThumb(assets[i], size: 200)),
                ),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _QuickGrid extends StatelessWidget {
  const _QuickGrid({required this.services});
  final AppServices services;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final List<_QuickItem> items = <_QuickItem>[
      _QuickItem('🎯', t.deckSimilar, () => _push(context, const SimilarPage())),
      _QuickItem('🌫️', t.deckBlurry, () => _push(context, const SimilarPage(initialTab: 1))),
      _QuickItem('📱', t.deckScreenshots,
          () => _openDeck(context, t.deckScreenshots, services.library.screenshots())),
      _QuickItem(
          '🗓️',
          t.deckOldScreenshots,
          () => _openDeck(context, t.deckOldScreenshots,
              services.library.screenshots(olderThan: AppConfig.oldScreenshotAge))),
      _QuickItem('🎬', t.deckVideos, () async {
        showDialog<void>(
          context: context,
          barrierDismissible: false,
          builder: (_) => const Center(child: CircularProgressIndicator()),
        );
        final List<AssetEntity> vids = await services.library.videosBySize();
        if (!context.mounted) return;
        Navigator.of(context).pop();
        await _openDeck(context, t.deckVideos, vids);
      }),
      _QuickItem('💬', t.deckLine,
          () => _openDeck(context, t.deckLine, services.library.lineImages())),
      _QuickItem('🔀', t.deckRandom, () {
        final List<AssetEntity> shuffled = services.library.all
            .where((AssetEntity a) => services.state.isUndecided(a.id))
            .toList()
          ..shuffle();
        _openDeck(context, t.deckRandom, shuffled.take(300).toList());
      }),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 2.8,
        children: <Widget>[
          for (final _QuickItem i in items)
            Card(
              margin: EdgeInsets.zero,
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: i.onTap,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(children: <Widget>[
                    Text(i.emoji, style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(i.label,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ]),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _QuickItem {
  const _QuickItem(this.emoji, this.label, this.onTap);
  final String emoji;
  final String label;
  final VoidCallback onTap;
}

class _MonthTile extends StatelessWidget {
  const _MonthTile({required this.month, required this.assets, required this.state});
  final MonthKey month;
  final List<AssetEntity> assets;
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    final int done = assets.where((AssetEntity a) => state.decisionOf(a.id) != null).length;
    final bool complete = done == assets.length;
    return ListTile(
      leading: SizedBox(
        width: 48,
        height: 48,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: AssetThumb(assets.first, size: 150),
        ),
      ),
      title: Row(children: <Widget>[
        Text(t.monthLabel(month),
            style: TextStyle(
              decoration: complete ? TextDecoration.lineThrough : null,
              fontWeight: FontWeight.w600,
            )),
        if (complete) const Padding(
          padding: EdgeInsets.only(left: 6),
          child: Icon(Icons.check_circle, color: Colors.green, size: 18),
        ),
      ]),
      subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: <Widget>[
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: assets.isEmpty ? 0 : done / assets.length,
          minHeight: 5,
          borderRadius: BorderRadius.circular(4),
        ),
        const SizedBox(height: 2),
        Text(t.monthProgress(done, assets.length)),
      ]),
      onTap: complete
          ? null
          : () => _openDeck(context, t.monthLabel(month), assets, month: month),
    );
  }
}

class _Achievements extends StatelessWidget {
  const _Achievements({required this.unlocked});
  final Set<String> unlocked;

  @override
  Widget build(BuildContext context) {
    final S t = S.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Wrap(
        spacing: 8,
        runSpacing: 8,
        children: <Widget>[
          for (final Achievement a in allAchievements)
            Opacity(
              opacity: unlocked.contains(a.id) ? 1 : 0.3,
              child: Chip(
                avatar: Text(a.emoji),
                label: Text(t.achievementName(a.id), style: const TextStyle(fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 22, 16, 8),
        child: Text(text, style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            )),
      );
}
