Necesito agregar la siguiente funcionalidad. Tengo los dos sensores de presión  (sensor 1 y sensor2). Ahora se está haciendo el plot de las variables absolutas. Sin embargo necesito las siguientes funcionalidades.

1. Tener un apartado en donde pueda establecer el cero. Básicamente la idea es emplear sensor 2 como referencia, mientras que el sensor 1 es el que va a tener la variación. Ahora bien necesito tener una acción en la página web que me eliminar la diferencia entre el sensor 1 y el sensor 2. Esto se debe a que muchos de los experimentos que se desean hacer requieren de saber la diferencia de presiones. 

2. Necesito emplear una librería de plots ligera en la cual el eje de presión y tiempo puedan verse claramente. Todo punto que se sume al plot debe poder verse en el plot. La información de la diferencia debe tener la acción detallada en el punto 1 en donde se realiza el tarado (zero) del sensor 1 empleando el sensor 2 como referencia y sumando una constante. 

3. Necesito que todos los plots tengan los ejes con unidades. El eje temporal debe indicar la fecha y el vertical que se encuentra en Pascales. Todos los plots se deben poder compartir como imagen o archivo de texto .csv

4. Necesito que la página web tenga un apartado en donde se pueda registrar y comparar multiples corridas. La idea es comparar el valor diferencial entre el sensor 1 (corregido por el tarado / zero) en varias realizaciones del experimento. Por ahora cada 'lapse' puede definirse tocando un botón. El plot de este modo debe tener el tiempo en segundos desde el inicio del 'lapse'. Se requiere un segundo botón para resetear. El plot puede tener todas la opción de que las series tenga diferente color, o que series viejas tenga un color más apagado que la serie actual (como para dar una idea de histograma).

5. La aplicación será empleada principalmente desde celulares, con lo que la distribución, dimensiones y funcionalidades deben estar pensadas para ese fin. 

6. Ninguna de estas funcionalidades debe requerir conexión a internet. 

7. Los plots se deben actualizar a medida que la información se realiza pull. Cuando un nuevo dato es leído, se deben hacer las cuentas de diferencia entre los sensores y actualizar todos los plots. El plot de lapses tiene que poder plotear las anteriores corridas también. 

