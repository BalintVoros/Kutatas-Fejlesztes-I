<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'Exception.php';
require 'PHPMailer.php';
require 'SMTP.php';

$mail = new PHPMailer();
$mail->IsSMTP();                                          // SMTP-n keresztuli kuldes
$mail->Host     = 'smtp.rackhost.hu';                     // SMTP szerverek
$mail->SMTPAuth = true;                                   // SMTP

$mail->Username = 'postafiok@sajat-domain.hu';            // SMTP felhasználo
$mail->Password = 'secret';                               // SMTP jelszo

$mail->From     = 'postafiok@sajat-domain.hu';            // Felado e-mail cime
$mail->FromName = 'Vezeteknev Keresztnev';                // Felado neve
$mail->AddAddress('josh@site.com', 'Josh Adams');         // Cimzett es neve
$mail->AddAddress('ellen@site.com');                      // Meg egy cimzett
$mail->AddReplyTo('info@sajat-domain.hu', 'Information'); // Valaszlevel ide

$mail->WordWrap = 80;                                     // Sortores allitasa
$mail->AddAttachment('/var/tmp/file.tar.gz');             // Csatolas
$mail->AddAttachment('/tmp/image.jpg', 'new.jpg');        // Csatolas mas neven
$mail->IsHTML(true);                                      // Kuldes HTML-kent

$mail->Subject = 'Here is the subject';                   // A level targya
$mail->Body    = 'This is the <b>HTML body</b>';          // A level tartalma
$mail->AltBody = 'This is the text-only body';            // A level szoveges tartalma

if (!$mail->Send()) {
  echo 'A levél nem került elküldésre';
  echo 'A felmerült hiba: ' . $mail->ErrorInfo;
  exit;
}

echo 'A levelet sikeresen kiküldtük';
?>