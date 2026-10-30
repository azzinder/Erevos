package expo.modules.erevoscontacts

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import com.google.zxing.BarcodeFormat
import com.google.zxing.BinaryBitmap
import com.google.zxing.DecodeHintType
import com.google.zxing.LuminanceSource
import com.google.zxing.RGBLuminanceSource
import com.google.zxing.ReaderException
import com.google.zxing.Result
import com.google.zxing.ResultMetadataType
import com.google.zxing.common.GlobalHistogramBinarizer
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.QRCodeReader

/**
 * The text of a QR code in a photo (a contact's vCard, taken or picked by the owner), read here
 * with ZXing: nothing leaves the phone. The photo is read at most 1600 points wide; a code that
 * does not read at first is tried with a plainer threshold, then light on dark.
 */
internal object QrReader {
  private const val MOST = 1600

  fun read(context: Context, address: String): String? = decode(context, address)?.text

  /**
   * The bytes of a QR code in a photo, as written, base64 (a Matrix check's code is bytes, not
   * words): its byte segments, or null when it has none or no code.
   */
  fun readBytes(context: Context, address: String): String? {
    @Suppress("UNCHECKED_CAST")
    val segments = decode(context, address)?.resultMetadata?.get(ResultMetadataType.BYTE_SEGMENTS) as? List<ByteArray> ?: return null
    val out = java.io.ByteArrayOutputStream()
    segments.forEach { out.write(it) }
    return Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
  }

  private fun decode(context: Context, address: String): Result? {
    val uri = Uri.parse(address)
    val resolver = context.contentResolver
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    // Read for its size only, the decoder gives no picture: the size is in bounds.
    (resolver.openInputStream(uri) ?: throw IllegalStateException("The photo could not be opened")).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IllegalStateException("The photo is of a kind not read here")
    var sample = 1
    while (bounds.outWidth / sample > MOST || bounds.outHeight / sample > MOST) sample *= 2
    val options = BitmapFactory.Options().apply { inSampleSize = sample }
    val bitmap = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) } ?: throw IllegalStateException("The photo could not be read")
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
    bitmap.recycle()
    val source: LuminanceSource = RGBLuminanceSource(width, height, pixels)
    // A code written in UTF-8 without saying so (as Erevos writes a vCard's) reads as UTF-8.
    val hints = mapOf(
      DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
      DecodeHintType.TRY_HARDER to true,
      DecodeHintType.CHARACTER_SET to "UTF-8",
    )
    for (luminance in listOf(source, source.invert())) {
      for (binary in listOf(BinaryBitmap(HybridBinarizer(luminance)), BinaryBitmap(GlobalHistogramBinarizer(luminance)))) {
        try {
          return QRCodeReader().decode(binary, hints)
        } catch (_: ReaderException) {
          // Tried the next way.
        }
      }
    }
    return null
  }
}
