import 'package:flutter/widgets.dart';

abstract final class Motion {
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 320);

  /// Returns zero when the platform asks for reduced motion.
  static Duration of(BuildContext context, Duration duration) {
    final reduced = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    return reduced ? Duration.zero : duration;
  }
}
