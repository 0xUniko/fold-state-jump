; ModuleID = 'prototype/fixtures/fold_recurrence.cpp'
source_filename = "prototype/fixtures/fold_recurrence.cpp"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-linux-gnu"

%struct.Box = type { %"class.std::vector", %struct.Bucket, ptr }
%"class.std::vector" = type { %"struct.std::_Vector_base" }
%"struct.std::_Vector_base" = type { %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl" }
%"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl" = type { %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data" }
%"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data" = type { ptr, ptr, ptr }
%struct.Bucket = type { i32, i32 }
%"class.std::allocator" = type { i8 }
%"class.__gnu_cxx::__normal_iterator" = type { ptr }
%class.anon = type { i8 }
%struct.Env = type { i32, %struct.Box }
%"struct.std::random_access_iterator_tag" = type { i8 }
%"struct.std::integral_constant" = type { i8 }
%"class.__gnu_cxx::__normal_iterator.0" = type { ptr }

$_ZN3BoxC2EOS_ = comdat any

$_ZNSt6vectorIiSaIiEEC2EOS1_ = comdat any

$_ZNSt6vectorIiSaIiEEC2EmRKS0_ = comdat any

$_ZSt4iotaIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEiEvT_S7_T0_ = comdat any

$_ZNSt6vectorIiSaIiEE5beginEv = comdat any

$_ZNSt6vectorIiSaIiEE3endEv = comdat any

$_ZN3BoxC2ERKS_ = comdat any

$_ZN3BoxD2Ev = comdat any

$_ZNSt6vectorIiSaIiEED2Ev = comdat any

$_ZNSt12_Vector_baseIiSaIiEEC2EOS1_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2EOS2_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2EOS2_ = comdat any

$_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_ = comdat any

$_ZNSt6vectorIiSaIiEE21_M_default_initializeEm = comdat any

$_ZNSt12_Vector_baseIiSaIiEED2Ev = comdat any

$_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_ = comdat any

$_ZSt3minImERKT_S2_S2_ = comdat any

$__clang_call_terminate = comdat any

$_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2ERKS0_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm = comdat any

$_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD2Ev = comdat any

$_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm = comdat any

$_ZNSt15__new_allocatorIiE8allocateEmPKv = comdat any

$_ZSt27__uninitialized_default_n_aIPimiET_S1_T0_RSaIT1_E = comdat any

$_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv = comdat any

$_ZSt25__uninitialized_default_nIPimET_S1_T0_ = comdat any

$_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_ = comdat any

$_ZSt10_ConstructIiJEEvPT_DpOT0_ = comdat any

$_ZSt6fill_nIPimiET_S1_T0_RKT1_ = comdat any

$_ZSt10__fill_n_aIPimiET_S1_T0_RKT1_St26random_access_iterator_tag = comdat any

$_ZSt17__size_to_integerm = comdat any

$_ZSt8__fill_aIPiiEvT_S1_RKT0_ = comdat any

$_ZSt9__fill_a1IPiiEN9__gnu_cxx11__enable_ifIXsr11__is_scalarIT0_EE7__valueEvE6__typeET_S6_RKS3_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim = comdat any

$_ZNSt15__new_allocatorIiE10deallocateEPim = comdat any

$_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE = comdat any

$_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv = comdat any

$_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv = comdat any

$_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv = comdat any

$_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC2ERKS1_ = comdat any

$_ZN3BoxaSEOS_ = comdat any

$_ZNSt6vectorIiSaIiEEaSEOS1_ = comdat any

$_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE = comdat any

$_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv = comdat any

$_ZNSt6vectorIiSaIiEEC2ERKS0_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_ = comdat any

$_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv = comdat any

$_ZNSt12_Vector_baseIiSaIiEEC2ERKS0_ = comdat any

$_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2Ev = comdat any

$_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_ = comdat any

$_ZNSt6vectorIiSaIiEEC2ERKS1_ = comdat any

$_ZNKSt6vectorIiSaIiEE4sizeEv = comdat any

$_ZSt22__uninitialized_copy_aIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiiET0_T_SA_S9_RSaIT1_E = comdat any

$_ZNKSt6vectorIiSaIiEE5beginEv = comdat any

$_ZNKSt6vectorIiSaIiEE3endEv = comdat any

$_ZSt18uninitialized_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_ = comdat any

$_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_ = comdat any

$_ZSt4copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_ = comdat any

$_ZSt13__copy_move_aILb0EN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET1_T0_SA_S9_ = comdat any

$_ZSt12__miter_baseIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEET_S8_ = comdat any

$_ZSt12__niter_wrapIPiET_RKS1_S1_ = comdat any

$_ZSt14__copy_move_a1ILb0EPKiPiET1_T0_S4_S3_ = comdat any

$_ZSt12__niter_baseIPKiSt6vectorIiSaIiEEET_N9__gnu_cxx17__normal_iteratorIS5_T0_EE = comdat any

$_ZSt12__niter_baseIPiET_S1_ = comdat any

$_ZSt14__copy_move_a2ILb0EPKiPiET1_T0_S4_S3_ = comdat any

$_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_ = comdat any

$_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_ = comdat any

$_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv = comdat any

$_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC2ERKS2_ = comdat any

$_ZSt8_DestroyIPiEvT_S1_ = comdat any

$_ZNSt12_Destroy_auxILb1EE9__destroyIPiEEvT_S3_ = comdat any

@.str = private unnamed_addr constant [49 x i8] c"cannot create std::vector larger than max_size()\00", align 1, !dbg !0

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define dso_local void @_Z5carry3Box(ptr dead_on_unwind noalias writable sret(%struct.Box) align 8 %0, ptr noundef align 8 %1) #0 !dbg !646 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !649, !DIExpression(DW_OP_deref), !650)
  %5 = getelementptr inbounds nuw %struct.Box, ptr %1, i32 0, i32 1, !dbg !651
  %6 = getelementptr inbounds nuw %struct.Bucket, ptr %5, i32 0, i32 0, !dbg !652
  %7 = load i32, ptr %6, align 8, !dbg !653
  %8 = add nsw i32 %7, 1, !dbg !653
  store i32 %8, ptr %6, align 8, !dbg !653
  call void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %1) #8, !dbg !654
  ret void, !dbg !655
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %1) unnamed_addr #0 comdat align 2 !dbg !656 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !662, !DIExpression(), !664)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !665, !DIExpression(), !664)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 0, !dbg !666
  %7 = load ptr, ptr %4, align 8, !dbg !666, !nonnull !138, !align !667
  %8 = getelementptr inbounds nuw %struct.Box, ptr %7, i32 0, i32 0, !dbg !666
  call void @_ZNSt6vectorIiSaIiEEC2EOS1_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 8 dereferenceable(24) %8) #8, !dbg !666
  %9 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 1, !dbg !666
  %10 = load ptr, ptr %4, align 8, !dbg !666
  %11 = getelementptr inbounds nuw %struct.Box, ptr %10, i32 0, i32 1, !dbg !666
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %9, ptr align 8 %11, i64 16, i1 false), !dbg !666
  ret void, !dbg !666
}

; Function Attrs: mustprogress noinline optnone uwtable
define dso_local noundef i32 @_Z7advance3Envi(ptr noundef align 8 %0, i32 noundef %1) #1 personality ptr @__gxx_personality_v0 !dbg !668 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i32, align 4
  %9 = alloca %struct.Box, align 8
  %10 = alloca %"class.std::vector", align 8
  %11 = alloca %"class.std::allocator", align 1
  %12 = alloca ptr, align 8
  %13 = alloca i32, align 4
  %14 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %15 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %16 = alloca %struct.Box, align 8
  %17 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %18 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %19 = alloca %struct.Box, align 8
  %20 = alloca %class.anon, align 1
  %21 = alloca %struct.Box, align 8
  %22 = alloca %struct.Box, align 8
  store ptr %0, ptr %7, align 8
    #dbg_declare(ptr %7, !677, !DIExpression(DW_OP_deref), !678)
  store i32 %1, ptr %8, align 4
    #dbg_declare(ptr %8, !679, !DIExpression(), !680)
    #dbg_declare(ptr %9, !681, !DIExpression(), !682)
  %23 = getelementptr inbounds nuw %struct.Box, ptr %9, i32 0, i32 0, !dbg !683
  %24 = getelementptr inbounds nuw %struct.Env, ptr %0, i32 0, i32 1, !dbg !684
  %25 = getelementptr inbounds nuw %struct.Box, ptr %24, i32 0, i32 0, !dbg !685
  call void @_ZNSt6vectorIiSaIiEEC2EOS1_(ptr noundef nonnull align 8 dereferenceable(24) %23, ptr noundef nonnull align 8 dereferenceable(24) %25) #8, !dbg !686
  %26 = getelementptr inbounds nuw %struct.Box, ptr %9, i32 0, i32 1, !dbg !683
  %27 = getelementptr inbounds nuw %struct.Env, ptr %0, i32 0, i32 1, !dbg !687
  %28 = getelementptr inbounds nuw %struct.Box, ptr %27, i32 0, i32 1, !dbg !688
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %26, ptr align 4 %28, i64 8, i1 false), !dbg !689
  %29 = getelementptr inbounds nuw %struct.Box, ptr %9, i32 0, i32 2, !dbg !683
  store ptr null, ptr %29, align 8, !dbg !683
    #dbg_declare(ptr %10, !690, !DIExpression(), !691)
  %30 = load i32, ptr %8, align 4, !dbg !692
  %31 = sext i32 %30 to i64, !dbg !692
  store ptr %11, ptr %6, align 8
    #dbg_declare(ptr %6, !693, !DIExpression(), !696)
  %32 = load ptr, ptr %6, align 8
  store ptr %32, ptr %3, align 8
    #dbg_declare(ptr %3, !698, !DIExpression(), !701)
  %33 = load ptr, ptr %3, align 8
  invoke void @_ZNSt6vectorIiSaIiEEC2EmRKS0_(ptr noundef nonnull align 8 dereferenceable(24) %10, i64 noundef %31, ptr noundef nonnull align 1 dereferenceable(1) %11)
          to label %34 unwind label %58, !dbg !691

34:                                               ; preds = %2
  store ptr %11, ptr %5, align 8
    #dbg_declare(ptr %5, !703, !DIExpression(), !705)
  %35 = load ptr, ptr %5, align 8
  %36 = call ptr @_ZNSt6vectorIiSaIiEE5beginEv(ptr noundef nonnull align 8 dereferenceable(24) %10) #8, !dbg !707
  %37 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %14, i32 0, i32 0, !dbg !707
  store ptr %36, ptr %37, align 8, !dbg !707
  %38 = call ptr @_ZNSt6vectorIiSaIiEE3endEv(ptr noundef nonnull align 8 dereferenceable(24) %10) #8, !dbg !708
  %39 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %15, i32 0, i32 0, !dbg !708
  store ptr %38, ptr %39, align 8, !dbg !708
  %40 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %14, i32 0, i32 0, !dbg !709
  %41 = load ptr, ptr %40, align 8, !dbg !709
  %42 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %15, i32 0, i32 0, !dbg !709
  %43 = load ptr, ptr %42, align 8, !dbg !709
  invoke void @_ZSt4iotaIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEiEvT_S7_T0_(ptr %41, ptr %43, i32 noundef 0)
          to label %44 unwind label %63, !dbg !709

44:                                               ; preds = %34
    #dbg_declare(ptr %16, !710, !DIExpression(), !711)
  %45 = call ptr @_ZNSt6vectorIiSaIiEE5beginEv(ptr noundef nonnull align 8 dereferenceable(24) %10) #8, !dbg !712
  %46 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %17, i32 0, i32 0, !dbg !712
  store ptr %45, ptr %46, align 8, !dbg !712
  %47 = call ptr @_ZNSt6vectorIiSaIiEE3endEv(ptr noundef nonnull align 8 dereferenceable(24) %10) #8, !dbg !713
  %48 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %18, i32 0, i32 0, !dbg !713
  store ptr %47, ptr %48, align 8, !dbg !713
  invoke void @_ZN3BoxC2ERKS_(ptr noundef nonnull align 8 dereferenceable(40) %19, ptr noundef nonnull align 8 dereferenceable(40) %9)
          to label %49 unwind label %63, !dbg !714

49:                                               ; preds = %44
  %50 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %17, i32 0, i32 0, !dbg !715
  %51 = load ptr, ptr %50, align 8, !dbg !715
  %52 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %18, i32 0, i32 0, !dbg !715
  %53 = load ptr, ptr %52, align 8, !dbg !715
  invoke void @"_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_"(ptr dead_on_unwind writable sret(%struct.Box) align 8 %16, ptr %51, ptr %53, ptr noundef align 8 %19)
          to label %54 unwind label %67, !dbg !715

54:                                               ; preds = %49
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %19) #8, !dbg !715
    #dbg_declare(ptr %21, !716, !DIExpression(), !717)
  call void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %22, ptr noundef nonnull align 8 dereferenceable(40) %16) #8, !dbg !718
  call void @_Z5carry3Box(ptr dead_on_unwind writable sret(%struct.Box) align 8 %21, ptr noundef align 8 %22), !dbg !719
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %22) #8, !dbg !719
  %55 = getelementptr inbounds nuw %struct.Box, ptr %16, i32 0, i32 1, !dbg !720
  %56 = getelementptr inbounds nuw %struct.Bucket, ptr %55, i32 0, i32 0, !dbg !721
  %57 = load i32, ptr %56, align 8, !dbg !721
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %21) #8, !dbg !722
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %16) #8, !dbg !722
  call void @_ZNSt6vectorIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %10) #8, !dbg !722
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %9) #8, !dbg !722
  ret i32 %57, !dbg !722

58:                                               ; preds = %2
  %59 = landingpad { ptr, i32 }
          cleanup, !dbg !722
  %60 = extractvalue { ptr, i32 } %59, 0, !dbg !722
  store ptr %60, ptr %12, align 8, !dbg !722
  %61 = extractvalue { ptr, i32 } %59, 1, !dbg !722
  store i32 %61, ptr %13, align 4, !dbg !722
  store ptr %11, ptr %4, align 8
    #dbg_declare(ptr %4, !703, !DIExpression(), !723)
  %62 = load ptr, ptr %4, align 8
  br label %72, !dbg !691

63:                                               ; preds = %44, %34
  %64 = landingpad { ptr, i32 }
          cleanup, !dbg !722
  %65 = extractvalue { ptr, i32 } %64, 0, !dbg !722
  store ptr %65, ptr %12, align 8, !dbg !722
  %66 = extractvalue { ptr, i32 } %64, 1, !dbg !722
  store i32 %66, ptr %13, align 4, !dbg !722
  br label %71, !dbg !722

67:                                               ; preds = %49
  %68 = landingpad { ptr, i32 }
          cleanup, !dbg !722
  %69 = extractvalue { ptr, i32 } %68, 0, !dbg !722
  store ptr %69, ptr %12, align 8, !dbg !722
  %70 = extractvalue { ptr, i32 } %68, 1, !dbg !722
  store i32 %70, ptr %13, align 4, !dbg !722
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %19) #8, !dbg !715
  br label %71, !dbg !715

71:                                               ; preds = %67, %63
  call void @_ZNSt6vectorIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %10) #8, !dbg !722
  br label %72, !dbg !722

72:                                               ; preds = %71, %58
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %9) #8, !dbg !722
  br label %73, !dbg !722

73:                                               ; preds = %72
  %74 = load ptr, ptr %12, align 8, !dbg !722
  %75 = load i32, ptr %13, align 4, !dbg !722
  %76 = insertvalue { ptr, i32 } poison, ptr %74, 0, !dbg !722
  %77 = insertvalue { ptr, i32 } %76, i32 %75, 1, !dbg !722
  resume { ptr, i32 } %77, !dbg !722
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEEC2EOS1_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) unnamed_addr #0 comdat align 2 !dbg !725 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !726, !DIExpression(), !728)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !729, !DIExpression(), !730)
  %5 = load ptr, ptr %3, align 8
  %6 = load ptr, ptr %4, align 8, !dbg !731, !nonnull !138, !align !667
  call void @_ZNSt12_Vector_baseIiSaIiEEC2EOS1_(ptr noundef nonnull align 8 dereferenceable(24) %5, ptr noundef nonnull align 8 dereferenceable(24) %6) #8, !dbg !731
  ret void, !dbg !732
}

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memcpy.p0.p0.i64(ptr noalias writeonly captures(none), ptr noalias readonly captures(none), i64, i1 immarg) #2

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEEC2EmRKS0_(ptr noundef nonnull align 8 dereferenceable(24) %0, i64 noundef %1, ptr noundef nonnull align 1 dereferenceable(1) %2) unnamed_addr #1 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !733 {
  %4 = alloca ptr, align 8
  %5 = alloca i64, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i32, align 4
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !734, !DIExpression(), !735)
  store i64 %1, ptr %5, align 8
    #dbg_declare(ptr %5, !736, !DIExpression(), !737)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !738, !DIExpression(), !739)
  %9 = load ptr, ptr %4, align 8
  %10 = load i64, ptr %5, align 8, !dbg !740
  %11 = load ptr, ptr %6, align 8, !dbg !741, !nonnull !138
  %12 = call noundef i64 @_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_(i64 noundef %10, ptr noundef nonnull align 1 dereferenceable(1) %11), !dbg !742
  %13 = load ptr, ptr %6, align 8, !dbg !743, !nonnull !138
  call void @_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_(ptr noundef nonnull align 8 dereferenceable(24) %9, i64 noundef %12, ptr noundef nonnull align 1 dereferenceable(1) %13), !dbg !744
  %14 = load i64, ptr %5, align 8, !dbg !745
  invoke void @_ZNSt6vectorIiSaIiEE21_M_default_initializeEm(ptr noundef nonnull align 8 dereferenceable(24) %9, i64 noundef %14)
          to label %15 unwind label %16, !dbg !747

15:                                               ; preds = %3
  ret void, !dbg !748

16:                                               ; preds = %3
  %17 = landingpad { ptr, i32 }
          cleanup, !dbg !749
  %18 = extractvalue { ptr, i32 } %17, 0, !dbg !749
  store ptr %18, ptr %7, align 8, !dbg !749
  %19 = extractvalue { ptr, i32 } %17, 1, !dbg !749
  store i32 %19, ptr %8, align 4, !dbg !749
  call void @_ZNSt12_Vector_baseIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %9) #8, !dbg !749
  br label %20, !dbg !749

20:                                               ; preds = %16
  %21 = load ptr, ptr %7, align 8, !dbg !749
  %22 = load i32, ptr %8, align 4, !dbg !749
  %23 = insertvalue { ptr, i32 } poison, ptr %21, 0, !dbg !749
  %24 = insertvalue { ptr, i32 } %23, i32 %22, 1, !dbg !749
  resume { ptr, i32 } %24, !dbg !749
}

declare i32 @__gxx_personality_v0(...)

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZSt4iotaIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEiEvT_S7_T0_(ptr %0, ptr %1, i32 noundef %2) #0 comdat !dbg !750 {
  %4 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %5 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %6 = alloca i32, align 4
  %7 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %4, i32 0, i32 0
  store ptr %0, ptr %7, align 8
  %8 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %5, i32 0, i32 0
  store ptr %1, ptr %8, align 8
    #dbg_declare(ptr %4, !756, !DIExpression(), !757)
    #dbg_declare(ptr %5, !758, !DIExpression(), !759)
  store i32 %2, ptr %6, align 4
    #dbg_declare(ptr %6, !760, !DIExpression(), !761)
  br label %9, !dbg !762

9:                                                ; preds = %17, %3
  %10 = call noundef zeroext i1 @_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE(ptr noundef nonnull align 8 dereferenceable(8) %4, ptr noundef nonnull align 8 dereferenceable(8) %5) #8, !dbg !763
  %11 = xor i1 %10, true, !dbg !763
  br i1 %11, label %12, label %19, !dbg !766

12:                                               ; preds = %9
  %13 = load i32, ptr %6, align 4, !dbg !767
  %14 = call noundef nonnull align 4 dereferenceable(4) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv(ptr noundef nonnull align 8 dereferenceable(8) %4) #8, !dbg !769
  store i32 %13, ptr %14, align 4, !dbg !770
  %15 = load i32, ptr %6, align 4, !dbg !771
  %16 = add nsw i32 %15, 1, !dbg !771
  store i32 %16, ptr %6, align 4, !dbg !771
  br label %17, !dbg !772

17:                                               ; preds = %12
  %18 = call noundef nonnull align 8 dereferenceable(8) ptr @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv(ptr noundef nonnull align 8 dereferenceable(8) %4) #8, !dbg !773
  br label %9, !dbg !774, !llvm.loop !775

19:                                               ; preds = %9
  ret void, !dbg !778
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local ptr @_ZNSt6vectorIiSaIiEE5beginEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !779 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %3 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !780, !DIExpression(), !781)
  %4 = load ptr, ptr %3, align 8
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %4, i32 0, i32 0, !dbg !782
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 0, !dbg !783
  call void @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC2ERKS1_(ptr noundef nonnull align 8 dereferenceable(8) %2, ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !784
  %7 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %2, i32 0, i32 0, !dbg !785
  %8 = load ptr, ptr %7, align 8, !dbg !785
  ret ptr %8, !dbg !785
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local ptr @_ZNSt6vectorIiSaIiEE3endEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !786 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %3 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !787, !DIExpression(), !788)
  %4 = load ptr, ptr %3, align 8
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %4, i32 0, i32 0, !dbg !789
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 1, !dbg !790
  call void @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC2ERKS1_(ptr noundef nonnull align 8 dereferenceable(8) %2, ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !791
  %7 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %2, i32 0, i32 0, !dbg !792
  %8 = load ptr, ptr %7, align 8, !dbg !792
  ret ptr %8, !dbg !792
}

; Function Attrs: mustprogress noinline optnone uwtable
define internal void @"_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_"(ptr dead_on_unwind noalias writable sret(%struct.Box) align 8 %0, ptr %1, ptr %2, ptr noundef align 8 %3) #1 personality ptr @__gxx_personality_v0 !dbg !793 {
  %5 = alloca ptr, align 8
  %6 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %7 = alloca %"class.__gnu_cxx::__normal_iterator", align 8
  %8 = alloca %class.anon, align 1
  %9 = alloca ptr, align 8
  %10 = alloca %struct.Box, align 8
  %11 = alloca %struct.Box, align 8
  %12 = alloca ptr, align 8
  %13 = alloca i32, align 4
  store ptr %0, ptr %5, align 8
  %14 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %6, i32 0, i32 0
  store ptr %1, ptr %14, align 8
  %15 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %7, i32 0, i32 0
  store ptr %2, ptr %15, align 8
    #dbg_declare(ptr %6, !800, !DIExpression(), !801)
    #dbg_declare(ptr %7, !802, !DIExpression(), !803)
  store ptr %3, ptr %9, align 8
    #dbg_declare(ptr %9, !804, !DIExpression(DW_OP_deref), !805)
    #dbg_declare(ptr %8, !806, !DIExpression(), !807)
  br label %16, !dbg !808

16:                                               ; preds = %24, %4
  %17 = call noundef zeroext i1 @_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE(ptr noundef nonnull align 8 dereferenceable(8) %6, ptr noundef nonnull align 8 dereferenceable(8) %7) #8, !dbg !809
  %18 = xor i1 %17, true, !dbg !809
  br i1 %18, label %19, label %30, !dbg !812

19:                                               ; preds = %16
  call void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %11, ptr noundef nonnull align 8 dereferenceable(40) %3) #8, !dbg !813
  %20 = call noundef nonnull align 4 dereferenceable(4) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv(ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !814
  %21 = load i32, ptr %20, align 4, !dbg !814
  invoke void @"_ZZ7advance3EnviENK3$_0clE3Boxi"(ptr dead_on_unwind writable sret(%struct.Box) align 8 %10, ptr noundef nonnull align 1 dereferenceable(1) %8, ptr noundef align 8 %11, i32 noundef %21)
          to label %22 unwind label %26, !dbg !815

22:                                               ; preds = %19
  %23 = call noundef nonnull align 8 dereferenceable(40) ptr @_ZN3BoxaSEOS_(ptr noundef nonnull align 8 dereferenceable(40) %3, ptr noundef nonnull align 8 dereferenceable(40) %10) #8, !dbg !816
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %10) #8, !dbg !817
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %11) #8, !dbg !817
  br label %24, !dbg !817

24:                                               ; preds = %22
  %25 = call noundef nonnull align 8 dereferenceable(8) ptr @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv(ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !818
  br label %16, !dbg !819, !llvm.loop !820

26:                                               ; preds = %19
  %27 = landingpad { ptr, i32 }
          cleanup, !dbg !822
  %28 = extractvalue { ptr, i32 } %27, 0, !dbg !822
  store ptr %28, ptr %12, align 8, !dbg !822
  %29 = extractvalue { ptr, i32 } %27, 1, !dbg !822
  store i32 %29, ptr %13, align 4, !dbg !822
  call void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %11) #8, !dbg !817
  br label %31, !dbg !817

30:                                               ; preds = %16
  call void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %3) #8, !dbg !823
  ret void, !dbg !824

31:                                               ; preds = %26
  %32 = load ptr, ptr %12, align 8, !dbg !817
  %33 = load i32, ptr %13, align 4, !dbg !817
  %34 = insertvalue { ptr, i32 } poison, ptr %32, 0, !dbg !817
  %35 = insertvalue { ptr, i32 } %34, i32 %33, 1, !dbg !817
  resume { ptr, i32 } %35, !dbg !817
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZN3BoxC2ERKS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %1) unnamed_addr #1 comdat align 2 !dbg !825 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !831, !DIExpression(), !832)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !833, !DIExpression(), !832)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 0, !dbg !834
  %7 = load ptr, ptr %4, align 8, !dbg !834, !nonnull !138, !align !667
  %8 = getelementptr inbounds nuw %struct.Box, ptr %7, i32 0, i32 0, !dbg !834
  call void @_ZNSt6vectorIiSaIiEEC2ERKS1_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 8 dereferenceable(24) %8), !dbg !834
  %9 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 1, !dbg !834
  %10 = load ptr, ptr %4, align 8, !dbg !834
  %11 = getelementptr inbounds nuw %struct.Box, ptr %10, i32 0, i32 1, !dbg !834
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %9, ptr align 8 %11, i64 16, i1 false), !dbg !834
  ret void, !dbg !834
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZN3BoxD2Ev(ptr noundef nonnull align 8 dead_on_return(40) dereferenceable(40) %0) unnamed_addr #0 comdat align 2 !dbg !835 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !839, !DIExpression(), !840)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %struct.Box, ptr %3, i32 0, i32 0, !dbg !841
  call void @_ZNSt6vectorIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %4) #8, !dbg !841
  ret void, !dbg !843
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %0) unnamed_addr #0 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !844 {
  %2 = alloca ptr, align 8
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  store ptr %0, ptr %5, align 8
    #dbg_declare(ptr %5, !845, !DIExpression(), !846)
  %6 = load ptr, ptr %5, align 8
  %7 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %6, i32 0, i32 0, !dbg !847
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %7, i32 0, i32 0, !dbg !849
  %9 = load ptr, ptr %8, align 8, !dbg !849
  %10 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %6, i32 0, i32 0, !dbg !850
  %11 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %10, i32 0, i32 1, !dbg !851
  %12 = load ptr, ptr %11, align 8, !dbg !851
  %13 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %6) #8, !dbg !852
  store ptr %9, ptr %2, align 8
    #dbg_declare(ptr %2, !853, !DIExpression(), !859)
  store ptr %12, ptr %3, align 8
    #dbg_declare(ptr %3, !861, !DIExpression(), !862)
  store ptr %13, ptr %4, align 8
    #dbg_declare(ptr %4, !863, !DIExpression(), !864)
  %14 = load ptr, ptr %2, align 8, !dbg !865
  %15 = load ptr, ptr %3, align 8, !dbg !866
  invoke void @_ZSt8_DestroyIPiEvT_S1_(ptr noundef %14, ptr noundef %15)
          to label %16 unwind label %18, !dbg !867

16:                                               ; preds = %1
  br label %17, !dbg !868

17:                                               ; preds = %16
  call void @_ZNSt12_Vector_baseIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %6) #8, !dbg !869
  ret void, !dbg !870

18:                                               ; preds = %1
  %19 = landingpad { ptr, i32 }
          catch ptr null, !dbg !871
  %20 = extractvalue { ptr, i32 } %19, 0, !dbg !871
  call void @__clang_call_terminate(ptr %20) #9, !dbg !871
  unreachable, !dbg !871
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEEC2EOS1_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) unnamed_addr #0 comdat align 2 !dbg !872 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !873, !DIExpression(), !875)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !876, !DIExpression(), !877)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !878
  %7 = load ptr, ptr %4, align 8, !dbg !878, !nonnull !138, !align !667
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %7, i32 0, i32 0, !dbg !878
  call void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2EOS2_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 8 dereferenceable(24) %8) #8, !dbg !878
  ret void, !dbg !879
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2EOS2_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) unnamed_addr #0 comdat align 2 !dbg !880 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  store ptr %0, ptr %7, align 8
    #dbg_declare(ptr %7, !881, !DIExpression(), !883)
  store ptr %1, ptr %8, align 8
    #dbg_declare(ptr %8, !884, !DIExpression(), !885)
  %9 = load ptr, ptr %7, align 8
  %10 = load ptr, ptr %8, align 8, !dbg !886, !nonnull !138, !align !667
  store ptr %9, ptr %5, align 8
    #dbg_declare(ptr %5, !887, !DIExpression(), !889)
  store ptr %10, ptr %6, align 8
    #dbg_declare(ptr %6, !891, !DIExpression(), !892)
  %11 = load ptr, ptr %5, align 8
  %12 = load ptr, ptr %6, align 8, !dbg !893, !nonnull !138
  store ptr %11, ptr %3, align 8
    #dbg_declare(ptr %3, !894, !DIExpression(), !896)
  store ptr %12, ptr %4, align 8
    #dbg_declare(ptr %4, !898, !DIExpression(), !899)
  %13 = load ptr, ptr %3, align 8
  %14 = load ptr, ptr %8, align 8, !dbg !900, !nonnull !138, !align !667
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2EOS2_(ptr noundef nonnull align 8 dereferenceable(24) %9, ptr noundef nonnull align 8 dereferenceable(24) %14) #8, !dbg !901
  ret void, !dbg !902
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2EOS2_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) unnamed_addr #0 comdat align 2 !dbg !903 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !904, !DIExpression(), !906)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !907, !DIExpression(), !908)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 0, !dbg !909
  %7 = load ptr, ptr %4, align 8, !dbg !910, !nonnull !138, !align !667
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %7, i32 0, i32 0, !dbg !911
  %9 = load ptr, ptr %8, align 8, !dbg !911
  store ptr %9, ptr %6, align 8, !dbg !909
  %10 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 1, !dbg !912
  %11 = load ptr, ptr %4, align 8, !dbg !913, !nonnull !138, !align !667
  %12 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %11, i32 0, i32 1, !dbg !914
  %13 = load ptr, ptr %12, align 8, !dbg !914
  store ptr %13, ptr %10, align 8, !dbg !912
  %14 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 2, !dbg !915
  %15 = load ptr, ptr %4, align 8, !dbg !916, !nonnull !138, !align !667
  %16 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %15, i32 0, i32 2, !dbg !917
  %17 = load ptr, ptr %16, align 8, !dbg !917
  store ptr %17, ptr %14, align 8, !dbg !915
  %18 = load ptr, ptr %4, align 8, !dbg !918, !nonnull !138, !align !667
  %19 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %18, i32 0, i32 2, !dbg !920
  store ptr null, ptr %19, align 8, !dbg !921
  %20 = load ptr, ptr %4, align 8, !dbg !922, !nonnull !138, !align !667
  %21 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %20, i32 0, i32 1, !dbg !923
  store ptr null, ptr %21, align 8, !dbg !924
  %22 = load ptr, ptr %4, align 8, !dbg !925, !nonnull !138, !align !667
  %23 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %22, i32 0, i32 0, !dbg !926
  store ptr null, ptr %23, align 8, !dbg !927
  ret void, !dbg !928
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef i64 @_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_(i64 noundef %0, ptr noundef nonnull align 1 dereferenceable(1) %1) #1 comdat align 2 !dbg !929 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i64, align 8
  %9 = alloca ptr, align 8
  %10 = alloca %"class.std::allocator", align 1
  store i64 %0, ptr %8, align 8
    #dbg_declare(ptr %8, !930, !DIExpression(), !931)
  store ptr %1, ptr %9, align 8
    #dbg_declare(ptr %9, !932, !DIExpression(), !933)
  %11 = load i64, ptr %8, align 8, !dbg !934
  %12 = load ptr, ptr %9, align 8, !dbg !936, !nonnull !138
  store ptr %10, ptr %5, align 8
    #dbg_declare(ptr %5, !887, !DIExpression(), !937)
  store ptr %12, ptr %6, align 8
    #dbg_declare(ptr %6, !891, !DIExpression(), !939)
  %13 = load ptr, ptr %5, align 8
  %14 = load ptr, ptr %6, align 8, !dbg !940, !nonnull !138
  store ptr %13, ptr %3, align 8
    #dbg_declare(ptr %3, !894, !DIExpression(), !941)
  store ptr %14, ptr %4, align 8
    #dbg_declare(ptr %4, !898, !DIExpression(), !943)
  %15 = load ptr, ptr %3, align 8
  %16 = call noundef i64 @_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_(ptr noundef nonnull align 1 dereferenceable(1) %10) #8, !dbg !944
  %17 = icmp ugt i64 %11, %16, !dbg !945
  store ptr %10, ptr %7, align 8
    #dbg_declare(ptr %7, !703, !DIExpression(), !946)
  %18 = load ptr, ptr %7, align 8
  br i1 %17, label %19, label %20, !dbg !934

19:                                               ; preds = %2
  call void @_ZSt20__throw_length_errorPKc(ptr noundef @.str) #10, !dbg !948
  unreachable, !dbg !948

20:                                               ; preds = %2
  %21 = load i64, ptr %8, align 8, !dbg !949
  ret i64 %21, !dbg !950
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_(ptr noundef nonnull align 8 dereferenceable(24) %0, i64 noundef %1, ptr noundef nonnull align 1 dereferenceable(1) %2) unnamed_addr #1 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !951 {
  %4 = alloca ptr, align 8
  %5 = alloca i64, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i32, align 4
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !952, !DIExpression(), !953)
  store i64 %1, ptr %5, align 8
    #dbg_declare(ptr %5, !954, !DIExpression(), !955)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !956, !DIExpression(), !957)
  %9 = load ptr, ptr %4, align 8
  %10 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %9, i32 0, i32 0, !dbg !958
  %11 = load ptr, ptr %6, align 8, !dbg !959, !nonnull !138
  call void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %10, ptr noundef nonnull align 1 dereferenceable(1) %11) #8, !dbg !958
  %12 = load i64, ptr %5, align 8, !dbg !960
  invoke void @_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm(ptr noundef nonnull align 8 dereferenceable(24) %9, i64 noundef %12)
          to label %13 unwind label %14, !dbg !962

13:                                               ; preds = %3
  ret void, !dbg !963

14:                                               ; preds = %3
  %15 = landingpad { ptr, i32 }
          cleanup, !dbg !964
  %16 = extractvalue { ptr, i32 } %15, 0, !dbg !964
  store ptr %16, ptr %7, align 8, !dbg !964
  %17 = extractvalue { ptr, i32 } %15, 1, !dbg !964
  store i32 %17, ptr %8, align 4, !dbg !964
  call void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %10) #8, !dbg !964
  br label %18, !dbg !964

18:                                               ; preds = %14
  %19 = load ptr, ptr %7, align 8, !dbg !964
  %20 = load i32, ptr %8, align 4, !dbg !964
  %21 = insertvalue { ptr, i32 } poison, ptr %19, 0, !dbg !964
  %22 = insertvalue { ptr, i32 } %21, i32 %20, 1, !dbg !964
  resume { ptr, i32 } %22, !dbg !964
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEE21_M_default_initializeEm(ptr noundef nonnull align 8 dereferenceable(24) %0, i64 noundef %1) #1 comdat align 2 !dbg !965 {
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !966, !DIExpression(), !967)
  store i64 %1, ptr %4, align 8
    #dbg_declare(ptr %4, !968, !DIExpression(), !969)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !970
  %7 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %6, i32 0, i32 0, !dbg !971
  %8 = load ptr, ptr %7, align 8, !dbg !971
  %9 = load i64, ptr %4, align 8, !dbg !972
  %10 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %5) #8, !dbg !973
  %11 = call noundef ptr @_ZSt27__uninitialized_default_n_aIPimiET_S1_T0_RSaIT1_E(ptr noundef %8, i64 noundef %9, ptr noundef nonnull align 1 dereferenceable(1) %10), !dbg !974
  %12 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !975
  %13 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %12, i32 0, i32 1, !dbg !976
  store ptr %11, ptr %13, align 8, !dbg !977
  ret void, !dbg !978
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %0) unnamed_addr #0 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !979 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !980, !DIExpression(), !981)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !982
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %4, i32 0, i32 0, !dbg !984
  %6 = load ptr, ptr %5, align 8, !dbg !984
  %7 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !985
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %7, i32 0, i32 2, !dbg !986
  %9 = load ptr, ptr %8, align 8, !dbg !986
  %10 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !987
  %11 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %10, i32 0, i32 0, !dbg !988
  %12 = load ptr, ptr %11, align 8, !dbg !988
  %13 = ptrtoint ptr %9 to i64, !dbg !989
  %14 = ptrtoint ptr %12 to i64, !dbg !989
  %15 = sub i64 %13, %14, !dbg !989
  %16 = sdiv exact i64 %15, 4, !dbg !989
  invoke void @_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim(ptr noundef nonnull align 8 dereferenceable(24) %3, ptr noundef %6, i64 noundef %16)
          to label %17 unwind label %19, !dbg !990

17:                                               ; preds = %1
  %18 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !991
  call void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %18) #8, !dbg !991
  ret void, !dbg !992

19:                                               ; preds = %1
  %20 = landingpad { ptr, i32 }
          catch ptr null, !dbg !990
  %21 = extractvalue { ptr, i32 } %20, 0, !dbg !990
  call void @__clang_call_terminate(ptr %21) #9, !dbg !990
  unreachable, !dbg !990
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef i64 @_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_(ptr noundef nonnull align 1 dereferenceable(1) %0) #0 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !993 {
  %2 = alloca ptr, align 8
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  %5 = alloca i64, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !994, !DIExpression(), !995)
    #dbg_declare(ptr %4, !996, !DIExpression(), !998)
  store i64 2305843009213693951, ptr %4, align 8, !dbg !998
    #dbg_declare(ptr %5, !999, !DIExpression(), !1000)
  %6 = load ptr, ptr %3, align 8, !dbg !1001, !nonnull !138
  store ptr %6, ptr %2, align 8
    #dbg_declare(ptr %2, !1002, !DIExpression(), !1004)
  store i64 4611686018427387903, ptr %5, align 8, !dbg !1000
  %7 = invoke noundef nonnull align 8 dereferenceable(8) ptr @_ZSt3minImERKT_S2_S2_(ptr noundef nonnull align 8 dereferenceable(8) %4, ptr noundef nonnull align 8 dereferenceable(8) %5)
          to label %8 unwind label %10, !dbg !1006

8:                                                ; preds = %1
  %9 = load i64, ptr %7, align 8, !dbg !1006
  ret i64 %9, !dbg !1007

10:                                               ; preds = %1
  %11 = landingpad { ptr, i32 }
          catch ptr null, !dbg !1006
  %12 = extractvalue { ptr, i32 } %11, 0, !dbg !1006
  call void @__clang_call_terminate(ptr %12) #9, !dbg !1006
  unreachable, !dbg !1006
}

; Function Attrs: noreturn
declare void @_ZSt20__throw_length_errorPKc(ptr noundef) #3

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(8) ptr @_ZSt3minImERKT_S2_S2_(ptr noundef nonnull align 8 dereferenceable(8) %0, ptr noundef nonnull align 8 dereferenceable(8) %1) #0 comdat !dbg !1008 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1016, !DIExpression(), !1017)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1018, !DIExpression(), !1019)
  %6 = load ptr, ptr %5, align 8, !dbg !1020, !nonnull !138, !align !667
  %7 = load i64, ptr %6, align 8, !dbg !1020
  %8 = load ptr, ptr %4, align 8, !dbg !1022, !nonnull !138, !align !667
  %9 = load i64, ptr %8, align 8, !dbg !1022
  %10 = icmp ult i64 %7, %9, !dbg !1023
  br i1 %10, label %11, label %13, !dbg !1023

11:                                               ; preds = %2
  %12 = load ptr, ptr %5, align 8, !dbg !1024, !nonnull !138, !align !667
  store ptr %12, ptr %3, align 8, !dbg !1025
  br label %15, !dbg !1025

13:                                               ; preds = %2
  %14 = load ptr, ptr %4, align 8, !dbg !1026, !nonnull !138, !align !667
  store ptr %14, ptr %3, align 8, !dbg !1027
  br label %15, !dbg !1027

15:                                               ; preds = %13, %11
  %16 = load ptr, ptr %3, align 8, !dbg !1028
  ret ptr %16, !dbg !1028
}

; Function Attrs: noinline noreturn nounwind uwtable
define linkonce_odr hidden void @__clang_call_terminate(ptr noundef %0) #4 comdat {
  %2 = call ptr @__cxa_begin_catch(ptr %0) #8
  call void @_ZSt9terminatev() #9
  unreachable
}

declare ptr @__cxa_begin_catch(ptr)

declare void @_ZSt9terminatev()

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 1 dereferenceable(1) %1) unnamed_addr #0 comdat align 2 !dbg !1029 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  store ptr %0, ptr %7, align 8
    #dbg_declare(ptr %7, !1030, !DIExpression(), !1031)
  store ptr %1, ptr %8, align 8
    #dbg_declare(ptr %8, !1032, !DIExpression(), !1033)
  %9 = load ptr, ptr %7, align 8
  %10 = load ptr, ptr %8, align 8, !dbg !1034, !nonnull !138
  store ptr %9, ptr %5, align 8
    #dbg_declare(ptr %5, !887, !DIExpression(), !1035)
  store ptr %10, ptr %6, align 8
    #dbg_declare(ptr %6, !891, !DIExpression(), !1037)
  %11 = load ptr, ptr %5, align 8
  %12 = load ptr, ptr %6, align 8, !dbg !1038, !nonnull !138
  store ptr %11, ptr %3, align 8
    #dbg_declare(ptr %3, !894, !DIExpression(), !1039)
  store ptr %12, ptr %4, align 8
    #dbg_declare(ptr %4, !898, !DIExpression(), !1041)
  %13 = load ptr, ptr %3, align 8
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2Ev(ptr noundef nonnull align 8 dereferenceable(24) %9) #8, !dbg !1042
  ret void, !dbg !1043
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm(ptr noundef nonnull align 8 dereferenceable(24) %0, i64 noundef %1) #1 comdat align 2 !dbg !1044 {
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1045, !DIExpression(), !1046)
  store i64 %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1047, !DIExpression(), !1048)
  %5 = load ptr, ptr %3, align 8
  %6 = load i64, ptr %4, align 8, !dbg !1049
  %7 = call noundef ptr @_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm(ptr noundef nonnull align 8 dereferenceable(24) %5, i64 noundef %6), !dbg !1050
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1051
  %9 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %8, i32 0, i32 0, !dbg !1052
  store ptr %7, ptr %9, align 8, !dbg !1053
  %10 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1054
  %11 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %10, i32 0, i32 0, !dbg !1055
  %12 = load ptr, ptr %11, align 8, !dbg !1055
  %13 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1056
  %14 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %13, i32 0, i32 1, !dbg !1057
  store ptr %12, ptr %14, align 8, !dbg !1058
  %15 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1059
  %16 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %15, i32 0, i32 0, !dbg !1060
  %17 = load ptr, ptr %16, align 8, !dbg !1060
  %18 = load i64, ptr %4, align 8, !dbg !1061
  %19 = getelementptr inbounds nuw i32, ptr %17, i64 %18, !dbg !1062
  %20 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1063
  %21 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %20, i32 0, i32 2, !dbg !1064
  store ptr %19, ptr %21, align 8, !dbg !1065
  ret void, !dbg !1066
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %0) unnamed_addr #0 comdat align 2 !dbg !1067 {
  %2 = alloca ptr, align 8
  %3 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1069, !DIExpression(), !1070)
  %4 = load ptr, ptr %3, align 8
  store ptr %4, ptr %2, align 8
    #dbg_declare(ptr %2, !703, !DIExpression(), !1071)
  %5 = load ptr, ptr %2, align 8
  ret void, !dbg !1074
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm(ptr noundef nonnull align 8 dereferenceable(24) %0, i64 noundef %1) #1 comdat align 2 !dbg !1075 {
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  %5 = alloca ptr, align 8
  %6 = alloca i64, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i64, align 8
  store ptr %0, ptr %7, align 8
    #dbg_declare(ptr %7, !1076, !DIExpression(), !1077)
  store i64 %1, ptr %8, align 8
    #dbg_declare(ptr %8, !1078, !DIExpression(), !1079)
  %9 = load ptr, ptr %7, align 8
  %10 = load i64, ptr %8, align 8, !dbg !1080
  %11 = icmp ne i64 %10, 0, !dbg !1081
  br i1 %11, label %12, label %20, !dbg !1080

12:                                               ; preds = %2
  %13 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %9, i32 0, i32 0, !dbg !1082
  %14 = load i64, ptr %8, align 8, !dbg !1083
  store ptr %13, ptr %5, align 8
    #dbg_declare(ptr %5, !1084, !DIExpression(), !1086)
  store i64 %14, ptr %6, align 8
    #dbg_declare(ptr %6, !1088, !DIExpression(), !1089)
  %15 = load ptr, ptr %5, align 8, !dbg !1090, !nonnull !138
  %16 = load i64, ptr %6, align 8, !dbg !1091
  store ptr %15, ptr %3, align 8
    #dbg_declare(ptr %3, !1092, !DIExpression(), !1094)
  store i64 %16, ptr %4, align 8
    #dbg_declare(ptr %4, !1096, !DIExpression(), !1097)
  %17 = load ptr, ptr %3, align 8
  %18 = load i64, ptr %4, align 8, !dbg !1098
  %19 = call noundef ptr @_ZNSt15__new_allocatorIiE8allocateEmPKv(ptr noundef nonnull align 1 dereferenceable(1) %17, i64 noundef %18, ptr noundef null), !dbg !1099
  br label %21, !dbg !1080

20:                                               ; preds = %2
  br label %21, !dbg !1080

21:                                               ; preds = %20, %12
  %22 = phi ptr [ %19, %12 ], [ null, %20 ], !dbg !1080
  ret ptr %22, !dbg !1100
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZNSt15__new_allocatorIiE8allocateEmPKv(ptr noundef nonnull align 1 dereferenceable(1) %0, i64 noundef %1, ptr noundef %2) #1 comdat align 2 !dbg !1101 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca i64, align 8
  %7 = alloca ptr, align 8
  store ptr %0, ptr %5, align 8
    #dbg_declare(ptr %5, !1102, !DIExpression(), !1103)
  store i64 %1, ptr %6, align 8
    #dbg_declare(ptr %6, !1104, !DIExpression(), !1105)
  store ptr %2, ptr %7, align 8
    #dbg_declare(ptr %7, !1106, !DIExpression(), !1107)
  %8 = load ptr, ptr %5, align 8
  %9 = load i64, ptr %6, align 8, !dbg !1108
  store ptr %8, ptr %4, align 8
    #dbg_declare(ptr %4, !1110, !DIExpression(), !1113)
  %10 = load ptr, ptr %4, align 8
  %11 = icmp ugt i64 %9, 2305843009213693951, !dbg !1115
  br i1 %11, label %12, label %17, !dbg !1116

12:                                               ; preds = %3
  %13 = load i64, ptr %6, align 8, !dbg !1117
  %14 = icmp ugt i64 %13, 4611686018427387903, !dbg !1120
  br i1 %14, label %15, label %16, !dbg !1120

15:                                               ; preds = %12
  call void @_ZSt28__throw_bad_array_new_lengthv() #10, !dbg !1121
  unreachable, !dbg !1121

16:                                               ; preds = %12
  call void @_ZSt17__throw_bad_allocv() #10, !dbg !1122
  unreachable, !dbg !1122

17:                                               ; preds = %3
  %18 = load i64, ptr %6, align 8, !dbg !1123
  %19 = mul i64 %18, 4, !dbg !1124
  %20 = call noalias noundef nonnull ptr @_Znwm(i64 noundef %19) #11, !dbg !1125
  ret ptr %20, !dbg !1126
}

; Function Attrs: noreturn
declare void @_ZSt28__throw_bad_array_new_lengthv() #3

; Function Attrs: noreturn
declare void @_ZSt17__throw_bad_allocv() #3

; Function Attrs: nobuiltin allocsize(0)
declare noundef nonnull ptr @_Znwm(i64 noundef) #5

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt27__uninitialized_default_n_aIPimiET_S1_T0_RSaIT1_E(ptr noundef %0, i64 noundef %1, ptr noundef nonnull align 1 dereferenceable(1) %2) #1 comdat !dbg !1127 {
  %4 = alloca ptr, align 8
  %5 = alloca i64, align 8
  %6 = alloca ptr, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1133, !DIExpression(), !1134)
  store i64 %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1135, !DIExpression(), !1136)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1137, !DIExpression(), !1138)
  %7 = load ptr, ptr %4, align 8, !dbg !1139
  %8 = load i64, ptr %5, align 8, !dbg !1140
  %9 = call noundef ptr @_ZSt25__uninitialized_default_nIPimET_S1_T0_(ptr noundef %7, i64 noundef %8), !dbg !1141
  ret ptr %9, !dbg !1142
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !1143 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1144, !DIExpression(), !1145)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !1146
  ret ptr %4, !dbg !1147
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt25__uninitialized_default_nIPimET_S1_T0_(ptr noundef %0, i64 noundef %1) #1 comdat !dbg !1148 {
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  %5 = alloca i8, align 1
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1152, !DIExpression(), !1153)
  store i64 %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1154, !DIExpression(), !1155)
    #dbg_declare(ptr %5, !1156, !DIExpression(), !1157)
  store i8 1, ptr %5, align 1, !dbg !1157
  %6 = load ptr, ptr %3, align 8, !dbg !1158
  %7 = load i64, ptr %4, align 8, !dbg !1159
  %8 = call noundef ptr @_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_(ptr noundef %6, i64 noundef %7), !dbg !1160
  ret ptr %8, !dbg !1161
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_(ptr noundef %0, i64 noundef %1) #1 comdat align 2 !dbg !1162 {
  %3 = alloca ptr, align 8
  %4 = alloca i64, align 8
  %5 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1167, !DIExpression(), !1168)
  store i64 %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1169, !DIExpression(), !1170)
  %6 = load i64, ptr %4, align 8, !dbg !1171
  %7 = icmp ugt i64 %6, 0, !dbg !1173
  br i1 %7, label %8, label %18, !dbg !1173

8:                                                ; preds = %2
    #dbg_declare(ptr %5, !1174, !DIExpression(), !1183)
  %9 = load ptr, ptr %3, align 8, !dbg !1184
  store ptr %9, ptr %5, align 8, !dbg !1183
  %10 = load ptr, ptr %5, align 8, !dbg !1185
  call void @_ZSt10_ConstructIiJEEvPT_DpOT0_(ptr noundef %10), !dbg !1186
  %11 = load ptr, ptr %3, align 8, !dbg !1187
  %12 = getelementptr inbounds nuw i32, ptr %11, i32 1, !dbg !1187
  store ptr %12, ptr %3, align 8, !dbg !1187
  %13 = load ptr, ptr %3, align 8, !dbg !1188
  %14 = load i64, ptr %4, align 8, !dbg !1189
  %15 = sub i64 %14, 1, !dbg !1190
  %16 = load ptr, ptr %5, align 8, !dbg !1191
  %17 = call noundef ptr @_ZSt6fill_nIPimiET_S1_T0_RKT1_(ptr noundef %13, i64 noundef %15, ptr noundef nonnull align 4 dereferenceable(4) %16), !dbg !1192
  store ptr %17, ptr %3, align 8, !dbg !1193
  br label %18, !dbg !1194

18:                                               ; preds = %8, %2
  %19 = load ptr, ptr %3, align 8, !dbg !1195
  ret ptr %19, !dbg !1196
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZSt10_ConstructIiJEEvPT_DpOT0_(ptr noundef %0) #0 comdat !dbg !1197 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1203, !DIExpression(), !1204)
  %3 = load ptr, ptr %2, align 8, !dbg !1205
  store i32 0, ptr %3, align 4, !dbg !1206
  ret void, !dbg !1207
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt6fill_nIPimiET_S1_T0_RKT1_(ptr noundef %0, i64 noundef %1, ptr noundef nonnull align 4 dereferenceable(4) %2) #1 comdat !dbg !1208 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca i64, align 8
  %7 = alloca ptr, align 8
  %8 = alloca %"struct.std::random_access_iterator_tag", align 1
  %9 = alloca %"struct.std::random_access_iterator_tag", align 1
  store ptr %0, ptr %5, align 8
    #dbg_declare(ptr %5, !1213, !DIExpression(), !1214)
  store i64 %1, ptr %6, align 8
    #dbg_declare(ptr %6, !1215, !DIExpression(), !1216)
  store ptr %2, ptr %7, align 8
    #dbg_declare(ptr %7, !1217, !DIExpression(), !1218)
  %10 = load ptr, ptr %5, align 8, !dbg !1219
  %11 = load i64, ptr %6, align 8, !dbg !1220
  %12 = call noundef i64 @_ZSt17__size_to_integerm(i64 noundef %11), !dbg !1221
  %13 = load ptr, ptr %7, align 8, !dbg !1222, !nonnull !138, !align !1223
  store ptr %5, ptr %4, align 8
    #dbg_declare(ptr %4, !1224, !DIExpression(), !1241)
  %14 = call noundef ptr @_ZSt10__fill_n_aIPimiET_S1_T0_RKT1_St26random_access_iterator_tag(ptr noundef %10, i64 noundef %12, ptr noundef nonnull align 4 dereferenceable(4) %13), !dbg !1243
  ret ptr %14, !dbg !1244
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt10__fill_n_aIPimiET_S1_T0_RKT1_St26random_access_iterator_tag(ptr noundef %0, i64 noundef %1, ptr noundef nonnull align 4 dereferenceable(4) %2) #1 comdat !dbg !1245 {
  %4 = alloca ptr, align 8
  %5 = alloca %"struct.std::random_access_iterator_tag", align 1
  %6 = alloca ptr, align 8
  %7 = alloca i64, align 8
  %8 = alloca ptr, align 8
  store ptr %0, ptr %6, align 8
    #dbg_declare(ptr %6, !1250, !DIExpression(), !1251)
  store i64 %1, ptr %7, align 8
    #dbg_declare(ptr %7, !1252, !DIExpression(), !1253)
  store ptr %2, ptr %8, align 8
    #dbg_declare(ptr %8, !1254, !DIExpression(), !1255)
    #dbg_declare(ptr %5, !1256, !DIExpression(), !1257)
  %9 = load i64, ptr %7, align 8, !dbg !1258
  %10 = icmp ule i64 %9, 0, !dbg !1260
  br i1 %10, label %11, label %13, !dbg !1260

11:                                               ; preds = %3
  %12 = load ptr, ptr %6, align 8, !dbg !1261
  store ptr %12, ptr %4, align 8, !dbg !1262
  br label %22, !dbg !1262

13:                                               ; preds = %3
  %14 = load ptr, ptr %6, align 8, !dbg !1263
  %15 = load ptr, ptr %6, align 8, !dbg !1264
  %16 = load i64, ptr %7, align 8, !dbg !1265
  %17 = getelementptr inbounds nuw i32, ptr %15, i64 %16, !dbg !1266
  %18 = load ptr, ptr %8, align 8, !dbg !1267, !nonnull !138, !align !1223
  call void @_ZSt8__fill_aIPiiEvT_S1_RKT0_(ptr noundef %14, ptr noundef %17, ptr noundef nonnull align 4 dereferenceable(4) %18), !dbg !1268
  %19 = load ptr, ptr %6, align 8, !dbg !1269
  %20 = load i64, ptr %7, align 8, !dbg !1270
  %21 = getelementptr inbounds nuw i32, ptr %19, i64 %20, !dbg !1271
  store ptr %21, ptr %4, align 8, !dbg !1272
  br label %22, !dbg !1272

22:                                               ; preds = %13, %11
  %23 = load ptr, ptr %4, align 8, !dbg !1273
  ret ptr %23, !dbg !1273
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef i64 @_ZSt17__size_to_integerm(i64 noundef %0) #0 comdat !dbg !1274 {
  %2 = alloca i64, align 8
  store i64 %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1277, !DIExpression(), !1278)
  %3 = load i64, ptr %2, align 8, !dbg !1279
  ret i64 %3, !dbg !1280
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZSt8__fill_aIPiiEvT_S1_RKT0_(ptr noundef %0, ptr noundef %1, ptr noundef nonnull align 4 dereferenceable(4) %2) #1 comdat !dbg !1281 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1286, !DIExpression(), !1287)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1288, !DIExpression(), !1289)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1290, !DIExpression(), !1291)
  %7 = load ptr, ptr %4, align 8, !dbg !1292
  %8 = load ptr, ptr %5, align 8, !dbg !1293
  %9 = load ptr, ptr %6, align 8, !dbg !1294, !nonnull !138, !align !1223
  call void @_ZSt9__fill_a1IPiiEN9__gnu_cxx11__enable_ifIXsr11__is_scalarIT0_EE7__valueEvE6__typeET_S6_RKS3_(ptr noundef %7, ptr noundef %8, ptr noundef nonnull align 4 dereferenceable(4) %9), !dbg !1295
  ret void, !dbg !1296
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZSt9__fill_a1IPiiEN9__gnu_cxx11__enable_ifIXsr11__is_scalarIT0_EE7__valueEvE6__typeET_S6_RKS3_(ptr noundef %0, ptr noundef %1, ptr noundef nonnull align 4 dereferenceable(4) %2) #0 comdat !dbg !1297 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca i32, align 4
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1306, !DIExpression(), !1307)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1308, !DIExpression(), !1309)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1310, !DIExpression(), !1311)
    #dbg_declare(ptr %7, !1312, !DIExpression(), !1313)
  %8 = load ptr, ptr %6, align 8, !dbg !1314, !nonnull !138, !align !1223
  %9 = load i32, ptr %8, align 4, !dbg !1314
  store i32 %9, ptr %7, align 4, !dbg !1313
  br label %10, !dbg !1315

10:                                               ; preds = %17, %3
  %11 = load ptr, ptr %4, align 8, !dbg !1316
  %12 = load ptr, ptr %5, align 8, !dbg !1319
  %13 = icmp ne ptr %11, %12, !dbg !1320
  br i1 %13, label %14, label %20, !dbg !1321

14:                                               ; preds = %10
  %15 = load i32, ptr %7, align 4, !dbg !1322
  %16 = load ptr, ptr %4, align 8, !dbg !1323
  store i32 %15, ptr %16, align 4, !dbg !1324
  br label %17, !dbg !1325

17:                                               ; preds = %14
  %18 = load ptr, ptr %4, align 8, !dbg !1326
  %19 = getelementptr inbounds nuw i32, ptr %18, i32 1, !dbg !1326
  store ptr %19, ptr %4, align 8, !dbg !1326
  br label %10, !dbg !1327, !llvm.loop !1328

20:                                               ; preds = %10
  ret void, !dbg !1330
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef %1, i64 noundef %2) #1 comdat align 2 !dbg !1331 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca i64, align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  %9 = alloca i64, align 8
  %10 = alloca ptr, align 8
  %11 = alloca ptr, align 8
  %12 = alloca i64, align 8
  store ptr %0, ptr %10, align 8
    #dbg_declare(ptr %10, !1332, !DIExpression(), !1333)
  store ptr %1, ptr %11, align 8
    #dbg_declare(ptr %11, !1334, !DIExpression(), !1335)
  store i64 %2, ptr %12, align 8
    #dbg_declare(ptr %12, !1336, !DIExpression(), !1337)
  %13 = load ptr, ptr %10, align 8
  %14 = load ptr, ptr %11, align 8, !dbg !1338
  %15 = icmp ne ptr %14, null, !dbg !1338
  br i1 %15, label %16, label %26, !dbg !1338

16:                                               ; preds = %3
  %17 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %13, i32 0, i32 0, !dbg !1340
  %18 = load ptr, ptr %11, align 8, !dbg !1341
  %19 = load i64, ptr %12, align 8, !dbg !1342
  store ptr %17, ptr %7, align 8
    #dbg_declare(ptr %7, !1343, !DIExpression(), !1345)
  store ptr %18, ptr %8, align 8
    #dbg_declare(ptr %8, !1347, !DIExpression(), !1348)
  store i64 %19, ptr %9, align 8
    #dbg_declare(ptr %9, !1349, !DIExpression(), !1350)
  %20 = load ptr, ptr %7, align 8, !dbg !1351, !nonnull !138
  %21 = load ptr, ptr %8, align 8, !dbg !1352
  %22 = load i64, ptr %9, align 8, !dbg !1353
  store ptr %20, ptr %4, align 8
    #dbg_declare(ptr %4, !1354, !DIExpression(), !1356)
  store ptr %21, ptr %5, align 8
    #dbg_declare(ptr %5, !1358, !DIExpression(), !1359)
  store i64 %22, ptr %6, align 8
    #dbg_declare(ptr %6, !1360, !DIExpression(), !1361)
  %23 = load ptr, ptr %4, align 8
  %24 = load ptr, ptr %5, align 8, !dbg !1362
  %25 = load i64, ptr %6, align 8, !dbg !1363
  call void @_ZNSt15__new_allocatorIiE10deallocateEPim(ptr noundef nonnull align 1 dereferenceable(1) %23, ptr noundef %24, i64 noundef %25), !dbg !1364
  br label %26, !dbg !1365

26:                                               ; preds = %16, %3
  ret void, !dbg !1366
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt15__new_allocatorIiE10deallocateEPim(ptr noundef nonnull align 1 dereferenceable(1) %0, ptr noundef %1, i64 noundef %2) #0 comdat align 2 !dbg !1367 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca i64, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1368, !DIExpression(), !1369)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1370, !DIExpression(), !1371)
  store i64 %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1372, !DIExpression(), !1373)
  %7 = load ptr, ptr %4, align 8
  %8 = load ptr, ptr %5, align 8, !dbg !1374
  %9 = load i64, ptr %6, align 8, !dbg !1375
  %10 = mul i64 %9, 4, !dbg !1376
  call void @_ZdlPvm(ptr noundef %8, i64 noundef %10) #12, !dbg !1377
  ret void, !dbg !1378
}

; Function Attrs: nobuiltin nounwind
declare void @_ZdlPvm(ptr noundef, i64 noundef) #6

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef zeroext i1 @_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE(ptr noundef nonnull align 8 dereferenceable(8) %0, ptr noundef nonnull align 8 dereferenceable(8) %1) #0 comdat !dbg !1379 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1383, !DIExpression(), !1384)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1385, !DIExpression(), !1386)
  %5 = load ptr, ptr %3, align 8, !dbg !1387, !nonnull !138, !align !667
  %6 = call noundef nonnull align 8 dereferenceable(8) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv(ptr noundef nonnull align 8 dereferenceable(8) %5) #8, !dbg !1388
  %7 = load ptr, ptr %6, align 8, !dbg !1388
  %8 = load ptr, ptr %4, align 8, !dbg !1389, !nonnull !138, !align !667
  %9 = call noundef nonnull align 8 dereferenceable(8) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv(ptr noundef nonnull align 8 dereferenceable(8) %8) #8, !dbg !1390
  %10 = load ptr, ptr %9, align 8, !dbg !1390
  %11 = icmp eq ptr %7, %10, !dbg !1391
  ret i1 %11, !dbg !1392
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 4 dereferenceable(4) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv(ptr noundef nonnull align 8 dereferenceable(8) %0) #0 comdat align 2 !dbg !1393 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1394, !DIExpression(), !1396)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %3, i32 0, i32 0, !dbg !1397
  %5 = load ptr, ptr %4, align 8, !dbg !1397
  ret ptr %5, !dbg !1398
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(8) ptr @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv(ptr noundef nonnull align 8 dereferenceable(8) %0) #0 comdat align 2 !dbg !1399 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1400, !DIExpression(), !1402)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %3, i32 0, i32 0, !dbg !1403
  %5 = load ptr, ptr %4, align 8, !dbg !1404
  %6 = getelementptr inbounds nuw i32, ptr %5, i32 1, !dbg !1404
  store ptr %6, ptr %4, align 8, !dbg !1404
  ret ptr %3, !dbg !1405
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(8) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv(ptr noundef nonnull align 8 dereferenceable(8) %0) #0 comdat align 2 !dbg !1406 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1407, !DIExpression(), !1408)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %3, i32 0, i32 0, !dbg !1409
  ret ptr %4, !dbg !1410
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC2ERKS1_(ptr noundef nonnull align 8 dereferenceable(8) %0, ptr noundef nonnull align 8 dereferenceable(8) %1) unnamed_addr #0 comdat align 2 !dbg !1411 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1412, !DIExpression(), !1413)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1414, !DIExpression(), !1415)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator", ptr %5, i32 0, i32 0, !dbg !1416
  %7 = load ptr, ptr %4, align 8, !dbg !1417, !nonnull !138, !align !667
  %8 = load ptr, ptr %7, align 8, !dbg !1417
  store ptr %8, ptr %6, align 8, !dbg !1416
  ret void, !dbg !1418
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define internal void @"_ZZ7advance3EnviENK3$_0clE3Boxi"(ptr dead_on_unwind noalias writable sret(%struct.Box) align 8 %0, ptr noundef nonnull align 1 dereferenceable(1) %1, ptr noundef align 8 %2, i32 noundef %3) #0 align 2 !dbg !1419 {
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca i32, align 4
  %9 = alloca ptr, align 8
  store ptr %0, ptr %5, align 8
  store ptr %1, ptr %6, align 8
    #dbg_declare(ptr %6, !1425, !DIExpression(), !1427)
  store ptr %2, ptr %7, align 8
    #dbg_declare(ptr %7, !1428, !DIExpression(DW_OP_deref), !1429)
  store i32 %3, ptr %8, align 4
    #dbg_declare(ptr %8, !1430, !DIExpression(), !1431)
  %10 = load ptr, ptr %6, align 8
    #dbg_declare(ptr %9, !1432, !DIExpression(), !1434)
  %11 = getelementptr inbounds nuw %struct.Box, ptr %2, i32 0, i32 1, !dbg !1435
  store ptr %11, ptr %9, align 8, !dbg !1434
  %12 = load i32, ptr %8, align 4, !dbg !1436
  %13 = srem i32 %12, 2, !dbg !1438
  %14 = icmp eq i32 %13, 0, !dbg !1439
  br i1 %14, label %15, label %20, !dbg !1439

15:                                               ; preds = %4
  %16 = load ptr, ptr %9, align 8, !dbg !1440, !nonnull !138, !align !1223
  %17 = getelementptr inbounds nuw %struct.Bucket, ptr %16, i32 0, i32 0, !dbg !1441
  %18 = load i32, ptr %17, align 4, !dbg !1442
  %19 = add nsw i32 %18, 1, !dbg !1442
  store i32 %19, ptr %17, align 4, !dbg !1442
  br label %25, !dbg !1442

20:                                               ; preds = %4
  %21 = load ptr, ptr %9, align 8, !dbg !1443, !nonnull !138, !align !1223
  %22 = getelementptr inbounds nuw %struct.Bucket, ptr %21, i32 0, i32 1, !dbg !1444
  %23 = load i32, ptr %22, align 4, !dbg !1445
  %24 = add nsw i32 %23, 1, !dbg !1445
  store i32 %24, ptr %22, align 4, !dbg !1445
  br label %25

25:                                               ; preds = %20, %15
  call void @_ZN3BoxC2EOS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %2) #8, !dbg !1446
  ret void, !dbg !1447
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(40) ptr @_ZN3BoxaSEOS_(ptr noundef nonnull align 8 dereferenceable(40) %0, ptr noundef nonnull align 8 dereferenceable(40) %1) #0 comdat align 2 !dbg !1448 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1453, !DIExpression(), !1454)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1455, !DIExpression(), !1454)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 0, !dbg !1456
  %7 = load ptr, ptr %4, align 8, !dbg !1456, !nonnull !138, !align !667
  %8 = getelementptr inbounds nuw %struct.Box, ptr %7, i32 0, i32 0, !dbg !1456
  %9 = call noundef nonnull align 8 dereferenceable(24) ptr @_ZNSt6vectorIiSaIiEEaSEOS1_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 8 dereferenceable(24) %8) #8, !dbg !1456
  %10 = getelementptr inbounds nuw %struct.Box, ptr %5, i32 0, i32 1, !dbg !1456
  %11 = load ptr, ptr %4, align 8, !dbg !1456
  %12 = getelementptr inbounds nuw %struct.Box, ptr %11, i32 0, i32 1, !dbg !1456
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %10, ptr align 8 %12, i64 16, i1 false), !dbg !1456
  ret ptr %5, !dbg !1456
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(24) ptr @_ZNSt6vectorIiSaIiEEaSEOS1_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) #0 comdat align 2 !dbg !1458 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca i8, align 1
  %6 = alloca %"struct.std::integral_constant", align 1
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1459, !DIExpression(), !1460)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1461, !DIExpression(), !1462)
  %7 = load ptr, ptr %3, align 8
    #dbg_declare(ptr %5, !1463, !DIExpression(), !1464)
  store i8 1, ptr %5, align 1, !dbg !1464
  %8 = load ptr, ptr %4, align 8, !dbg !1465, !nonnull !138, !align !667
  call void @_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE(ptr noundef nonnull align 8 dereferenceable(24) %7, ptr noundef nonnull align 8 dereferenceable(24) %8) #8, !dbg !1466
  ret ptr %7, !dbg !1467
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) #0 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !1468 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca %"struct.std::integral_constant", align 1
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  %9 = alloca %"class.std::vector", align 8
  %10 = alloca %"class.std::allocator", align 1
  store ptr %0, ptr %7, align 8
    #dbg_declare(ptr %7, !1469, !DIExpression(), !1470)
  store ptr %1, ptr %8, align 8
    #dbg_declare(ptr %8, !1471, !DIExpression(), !1472)
    #dbg_declare(ptr %6, !1473, !DIExpression(), !1474)
  %11 = load ptr, ptr %7, align 8
    #dbg_declare(ptr %9, !1475, !DIExpression(), !1476)
  call void @_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv(ptr dead_on_unwind writable sret(%"class.std::allocator") align 1 %10, ptr noundef nonnull align 8 dereferenceable(24) %11) #8, !dbg !1477
  call void @_ZNSt6vectorIiSaIiEEC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %9, ptr noundef nonnull align 1 dereferenceable(1) %10) #8, !dbg !1476
  store ptr %10, ptr %5, align 8
    #dbg_declare(ptr %5, !703, !DIExpression(), !1478)
  %12 = load ptr, ptr %5, align 8
  %13 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %11, i32 0, i32 0, !dbg !1480
  %14 = load ptr, ptr %8, align 8, !dbg !1481, !nonnull !138, !align !667
  %15 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %14, i32 0, i32 0, !dbg !1482
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_(ptr noundef nonnull align 8 dereferenceable(24) %13, ptr noundef nonnull align 8 dereferenceable(24) %15) #8, !dbg !1483
  %16 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %9, i32 0, i32 0, !dbg !1484
  %17 = load ptr, ptr %8, align 8, !dbg !1485, !nonnull !138, !align !667
  %18 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %17, i32 0, i32 0, !dbg !1486
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_(ptr noundef nonnull align 8 dereferenceable(24) %16, ptr noundef nonnull align 8 dereferenceable(24) %18) #8, !dbg !1487
  %19 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %11) #8, !dbg !1488
  %20 = load ptr, ptr %8, align 8, !dbg !1489, !nonnull !138, !align !667
  %21 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %20) #8, !dbg !1490
  store ptr %19, ptr %3, align 8
    #dbg_declare(ptr %3, !1491, !DIExpression(), !1493)
  store ptr %21, ptr %4, align 8
    #dbg_declare(ptr %4, !1495, !DIExpression(), !1496)
  %22 = load ptr, ptr %4, align 8, !dbg !1497, !nonnull !138
  %23 = load ptr, ptr %3, align 8, !dbg !1499, !nonnull !138
  br label %24, !dbg !1500

24:                                               ; preds = %2
  call void @_ZNSt6vectorIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %9) #8, !dbg !1501
  ret void, !dbg !1501

25:                                               ; No predecessors!
  %26 = landingpad { ptr, i32 }
          catch ptr null, !dbg !1502
  %27 = extractvalue { ptr, i32 } %26, 0, !dbg !1502
  call void @__clang_call_terminate(ptr %27) #9, !dbg !1502
  unreachable, !dbg !1502
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv(ptr dead_on_unwind noalias writable sret(%"class.std::allocator") align 1 %0, ptr noundef nonnull align 8 dereferenceable(24) %1) #0 comdat align 2 !dbg !1503 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  store ptr %0, ptr %7, align 8
  store ptr %1, ptr %8, align 8
    #dbg_declare(ptr %8, !1504, !DIExpression(), !1506)
  %9 = load ptr, ptr %8, align 8
  %10 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %9) #8, !dbg !1507
  store ptr %0, ptr %5, align 8
    #dbg_declare(ptr %5, !887, !DIExpression(), !1508)
  store ptr %10, ptr %6, align 8
    #dbg_declare(ptr %6, !891, !DIExpression(), !1510)
  %11 = load ptr, ptr %5, align 8
  %12 = load ptr, ptr %6, align 8, !dbg !1511, !nonnull !138
  store ptr %11, ptr %3, align 8
    #dbg_declare(ptr %3, !894, !DIExpression(), !1512)
  store ptr %12, ptr %4, align 8
    #dbg_declare(ptr %4, !898, !DIExpression(), !1514)
  %13 = load ptr, ptr %3, align 8
  ret void, !dbg !1515
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEEC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 1 dereferenceable(1) %1) unnamed_addr #0 comdat align 2 !dbg !1516 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1517, !DIExpression(), !1518)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1519, !DIExpression(), !1520)
  %5 = load ptr, ptr %3, align 8
  %6 = load ptr, ptr %4, align 8, !dbg !1521, !nonnull !138
  call void @_ZNSt12_Vector_baseIiSaIiEEC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %5, ptr noundef nonnull align 1 dereferenceable(1) %6) #8, !dbg !1522
  ret void, !dbg !1523
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) #0 comdat align 2 !dbg !1524 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1525, !DIExpression(), !1526)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1527, !DIExpression(), !1528)
  %6 = load ptr, ptr %3, align 8
    #dbg_declare(ptr %5, !1529, !DIExpression(), !1530)
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2Ev(ptr noundef nonnull align 8 dereferenceable(24) %5) #8, !dbg !1530
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_(ptr noundef nonnull align 8 dereferenceable(24) %5, ptr noundef nonnull align 8 dereferenceable(24) %6) #8, !dbg !1531
  %7 = load ptr, ptr %4, align 8, !dbg !1532, !nonnull !138, !align !667
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 8 dereferenceable(24) %7) #8, !dbg !1533
  %8 = load ptr, ptr %4, align 8, !dbg !1534, !nonnull !138, !align !667
  call void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_(ptr noundef nonnull align 8 dereferenceable(24) %8, ptr noundef nonnull align 8 dereferenceable(24) %5) #8, !dbg !1535
  ret void, !dbg !1536
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 1 dereferenceable(1) ptr @_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !1537 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1538, !DIExpression(), !1539)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !1540
  ret ptr %4, !dbg !1541
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEEC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 1 dereferenceable(1) %1) unnamed_addr #0 comdat align 2 !dbg !1542 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1543, !DIExpression(), !1544)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1545, !DIExpression(), !1546)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %5, i32 0, i32 0, !dbg !1547
  %7 = load ptr, ptr %4, align 8, !dbg !1548, !nonnull !138
  call void @_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2ERKS0_(ptr noundef nonnull align 8 dereferenceable(24) %6, ptr noundef nonnull align 1 dereferenceable(1) %7) #8, !dbg !1547
  ret void, !dbg !1549
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2Ev(ptr noundef nonnull align 8 dereferenceable(24) %0) unnamed_addr #0 comdat align 2 !dbg !1550 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1551, !DIExpression(), !1552)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %3, i32 0, i32 0, !dbg !1553
  store ptr null, ptr %4, align 8, !dbg !1553
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %3, i32 0, i32 1, !dbg !1554
  store ptr null, ptr %5, align 8, !dbg !1554
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %3, i32 0, i32 2, !dbg !1555
  store ptr null, ptr %6, align 8, !dbg !1555
  ret void, !dbg !1556
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) #0 comdat align 2 !dbg !1557 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1558, !DIExpression(), !1559)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1560, !DIExpression(), !1561)
  %5 = load ptr, ptr %3, align 8
  %6 = load ptr, ptr %4, align 8, !dbg !1562, !nonnull !138, !align !667
  %7 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %6, i32 0, i32 0, !dbg !1563
  %8 = load ptr, ptr %7, align 8, !dbg !1563
  %9 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 0, !dbg !1564
  store ptr %8, ptr %9, align 8, !dbg !1565
  %10 = load ptr, ptr %4, align 8, !dbg !1566, !nonnull !138, !align !667
  %11 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %10, i32 0, i32 1, !dbg !1567
  %12 = load ptr, ptr %11, align 8, !dbg !1567
  %13 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 1, !dbg !1568
  store ptr %12, ptr %13, align 8, !dbg !1569
  %14 = load ptr, ptr %4, align 8, !dbg !1570, !nonnull !138, !align !667
  %15 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %14, i32 0, i32 2, !dbg !1571
  %16 = load ptr, ptr %15, align 8, !dbg !1571
  %17 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 2, !dbg !1572
  store ptr %16, ptr %17, align 8, !dbg !1573
  ret void, !dbg !1574
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZNSt6vectorIiSaIiEEC2ERKS1_(ptr noundef nonnull align 8 dereferenceable(24) %0, ptr noundef nonnull align 8 dereferenceable(24) %1) unnamed_addr #1 comdat align 2 personality ptr @__gxx_personality_v0 !dbg !1575 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  %9 = alloca ptr, align 8
  %10 = alloca ptr, align 8
  %11 = alloca ptr, align 8
  %12 = alloca ptr, align 8
  %13 = alloca ptr, align 8
  %14 = alloca ptr, align 8
  %15 = alloca %"class.std::allocator", align 1
  %16 = alloca ptr, align 8
  %17 = alloca i32, align 4
  %18 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %19 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  store ptr %0, ptr %13, align 8
    #dbg_declare(ptr %13, !1576, !DIExpression(), !1577)
  store ptr %1, ptr %14, align 8
    #dbg_declare(ptr %14, !1578, !DIExpression(), !1579)
  %20 = load ptr, ptr %13, align 8
  %21 = load ptr, ptr %14, align 8, !dbg !1580, !nonnull !138, !align !667
  %22 = call noundef i64 @_ZNKSt6vectorIiSaIiEE4sizeEv(ptr noundef nonnull align 8 dereferenceable(24) %21) #8, !dbg !1581
  %23 = load ptr, ptr %14, align 8, !dbg !1582, !nonnull !138, !align !667
  %24 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %23) #8, !dbg !1583
  call void @llvm.experimental.noalias.scope.decl(metadata !1584), !dbg !1587
  store ptr %15, ptr %9, align 8, !noalias !1584
  store ptr %24, ptr %10, align 8, !noalias !1584
    #dbg_declare(ptr %10, !1588, !DIExpression(), !1590)
  %25 = load ptr, ptr %10, align 8, !dbg !1592, !noalias !1584, !nonnull !138
  call void @llvm.experimental.noalias.scope.decl(metadata !1593), !dbg !1596
  store ptr %15, ptr %7, align 8, !noalias !1593
  store ptr %25, ptr %8, align 8, !noalias !1593
    #dbg_declare(ptr %8, !1597, !DIExpression(), !1599)
  %26 = load ptr, ptr %8, align 8, !dbg !1601, !noalias !1593, !nonnull !138
  store ptr %15, ptr %5, align 8, !noalias !1593
    #dbg_declare(ptr %5, !887, !DIExpression(), !1602)
  store ptr %26, ptr %6, align 8, !noalias !1593
    #dbg_declare(ptr %6, !891, !DIExpression(), !1604)
  %27 = load ptr, ptr %5, align 8, !noalias !1593
  %28 = load ptr, ptr %6, align 8, !dbg !1605, !noalias !1593, !nonnull !138
  store ptr %27, ptr %3, align 8, !noalias !1593
    #dbg_declare(ptr %3, !894, !DIExpression(), !1606)
  store ptr %28, ptr %4, align 8, !noalias !1593
    #dbg_declare(ptr %4, !898, !DIExpression(), !1608)
  %29 = load ptr, ptr %3, align 8, !noalias !1593
  invoke void @_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_(ptr noundef nonnull align 8 dereferenceable(24) %20, i64 noundef %22, ptr noundef nonnull align 1 dereferenceable(1) %15)
          to label %30 unwind label %50, !dbg !1609

30:                                               ; preds = %2
  store ptr %15, ptr %12, align 8
    #dbg_declare(ptr %12, !703, !DIExpression(), !1610)
  %31 = load ptr, ptr %12, align 8
  %32 = load ptr, ptr %14, align 8, !dbg !1612, !nonnull !138, !align !667
  %33 = call ptr @_ZNKSt6vectorIiSaIiEE5beginEv(ptr noundef nonnull align 8 dereferenceable(24) %32) #8, !dbg !1614
  %34 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %18, i32 0, i32 0, !dbg !1614
  store ptr %33, ptr %34, align 8, !dbg !1614
  %35 = load ptr, ptr %14, align 8, !dbg !1615, !nonnull !138, !align !667
  %36 = call ptr @_ZNKSt6vectorIiSaIiEE3endEv(ptr noundef nonnull align 8 dereferenceable(24) %35) #8, !dbg !1616
  %37 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %19, i32 0, i32 0, !dbg !1616
  store ptr %36, ptr %37, align 8, !dbg !1616
  %38 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %20, i32 0, i32 0, !dbg !1617
  %39 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %38, i32 0, i32 0, !dbg !1618
  %40 = load ptr, ptr %39, align 8, !dbg !1618
  %41 = call noundef nonnull align 1 dereferenceable(1) ptr @_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv(ptr noundef nonnull align 8 dereferenceable(24) %20) #8, !dbg !1619
  %42 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %18, i32 0, i32 0, !dbg !1620
  %43 = load ptr, ptr %42, align 8, !dbg !1620
  %44 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %19, i32 0, i32 0, !dbg !1620
  %45 = load ptr, ptr %44, align 8, !dbg !1620
  %46 = invoke noundef ptr @_ZSt22__uninitialized_copy_aIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiiET0_T_SA_S9_RSaIT1_E(ptr %43, ptr %45, ptr noundef %40, ptr noundef nonnull align 1 dereferenceable(1) %41)
          to label %47 unwind label %55, !dbg !1620

47:                                               ; preds = %30
  %48 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %20, i32 0, i32 0, !dbg !1621
  %49 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %48, i32 0, i32 1, !dbg !1622
  store ptr %46, ptr %49, align 8, !dbg !1623
  ret void, !dbg !1624

50:                                               ; preds = %2
  %51 = landingpad { ptr, i32 }
          cleanup, !dbg !1624
  %52 = extractvalue { ptr, i32 } %51, 0, !dbg !1624
  store ptr %52, ptr %16, align 8, !dbg !1624
  %53 = extractvalue { ptr, i32 } %51, 1, !dbg !1624
  store i32 %53, ptr %17, align 4, !dbg !1624
  store ptr %15, ptr %11, align 8
    #dbg_declare(ptr %11, !703, !DIExpression(), !1625)
  %54 = load ptr, ptr %11, align 8
  br label %59, !dbg !1609

55:                                               ; preds = %30
  %56 = landingpad { ptr, i32 }
          cleanup, !dbg !1627
  %57 = extractvalue { ptr, i32 } %56, 0, !dbg !1627
  store ptr %57, ptr %16, align 8, !dbg !1627
  %58 = extractvalue { ptr, i32 } %56, 1, !dbg !1627
  store i32 %58, ptr %17, align 4, !dbg !1627
  call void @_ZNSt12_Vector_baseIiSaIiEED2Ev(ptr noundef nonnull align 8 dead_on_return(24) dereferenceable(24) %20) #8, !dbg !1627
  br label %59, !dbg !1627

59:                                               ; preds = %55, %50
  %60 = load ptr, ptr %16, align 8, !dbg !1609
  %61 = load i32, ptr %17, align 4, !dbg !1609
  %62 = insertvalue { ptr, i32 } poison, ptr %60, 0, !dbg !1609
  %63 = insertvalue { ptr, i32 } %62, i32 %61, 1, !dbg !1609
  resume { ptr, i32 } %63, !dbg !1609
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef i64 @_ZNKSt6vectorIiSaIiEE4sizeEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !1628 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1629, !DIExpression(), !1631)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !1632
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %4, i32 0, i32 1, !dbg !1633
  %6 = load ptr, ptr %5, align 8, !dbg !1633
  %7 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %3, i32 0, i32 0, !dbg !1634
  %8 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %7, i32 0, i32 0, !dbg !1635
  %9 = load ptr, ptr %8, align 8, !dbg !1635
  %10 = ptrtoint ptr %6 to i64, !dbg !1636
  %11 = ptrtoint ptr %9 to i64, !dbg !1636
  %12 = sub i64 %10, %11, !dbg !1636
  %13 = sdiv exact i64 %12, 4, !dbg !1636
  ret i64 %13, !dbg !1637
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt22__uninitialized_copy_aIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiiET0_T_SA_S9_RSaIT1_E(ptr %0, ptr %1, ptr noundef %2, ptr noundef nonnull align 1 dereferenceable(1) %3) #1 comdat !dbg !1638 {
  %5 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %6 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %7 = alloca ptr, align 8
  %8 = alloca ptr, align 8
  %9 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %10 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %11 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0
  store ptr %0, ptr %11, align 8
  %12 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %6, i32 0, i32 0
  store ptr %1, ptr %12, align 8
    #dbg_declare(ptr %5, !1643, !DIExpression(), !1644)
    #dbg_declare(ptr %6, !1645, !DIExpression(), !1646)
  store ptr %2, ptr %7, align 8
    #dbg_declare(ptr %7, !1647, !DIExpression(), !1648)
  store ptr %3, ptr %8, align 8
    #dbg_declare(ptr %8, !1649, !DIExpression(), !1650)
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %9, ptr align 8 %5, i64 8, i1 false), !dbg !1651
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %10, ptr align 8 %6, i64 8, i1 false), !dbg !1652
  %13 = load ptr, ptr %7, align 8, !dbg !1653
  %14 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %9, i32 0, i32 0, !dbg !1654
  %15 = load ptr, ptr %14, align 8, !dbg !1654
  %16 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %10, i32 0, i32 0, !dbg !1654
  %17 = load ptr, ptr %16, align 8, !dbg !1654
  %18 = call noundef ptr @_ZSt18uninitialized_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_(ptr %15, ptr %17, ptr noundef %13), !dbg !1654
  ret ptr %18, !dbg !1655
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local ptr @_ZNKSt6vectorIiSaIiEE5beginEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !1656 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %3 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1657, !DIExpression(), !1658)
  %4 = load ptr, ptr %3, align 8
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %4, i32 0, i32 0, !dbg !1659
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 0, !dbg !1660
  call void @_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC2ERKS2_(ptr noundef nonnull align 8 dereferenceable(8) %2, ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !1661
  %7 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %2, i32 0, i32 0, !dbg !1662
  %8 = load ptr, ptr %7, align 8, !dbg !1662
  ret ptr %8, !dbg !1662
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local ptr @_ZNKSt6vectorIiSaIiEE3endEv(ptr noundef nonnull align 8 dereferenceable(24) %0) #0 comdat align 2 !dbg !1663 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %3 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1664, !DIExpression(), !1665)
  %4 = load ptr, ptr %3, align 8
  %5 = getelementptr inbounds nuw %"struct.std::_Vector_base", ptr %4, i32 0, i32 0, !dbg !1666
  %6 = getelementptr inbounds nuw %"struct.std::_Vector_base<int, std::allocator<int>>::_Vector_impl_data", ptr %5, i32 0, i32 1, !dbg !1667
  call void @_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC2ERKS2_(ptr noundef nonnull align 8 dereferenceable(8) %2, ptr noundef nonnull align 8 dereferenceable(8) %6) #8, !dbg !1668
  %7 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %2, i32 0, i32 0, !dbg !1669
  %8 = load ptr, ptr %7, align 8, !dbg !1669
  ret ptr %8, !dbg !1669
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt18uninitialized_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_(ptr %0, ptr %1, ptr noundef %2) #1 comdat !dbg !1670 {
  %4 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %5 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %6 = alloca ptr, align 8
  %7 = alloca i8, align 1
  %8 = alloca i8, align 1
  %9 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %10 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %11 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %4, i32 0, i32 0
  store ptr %0, ptr %11, align 8
  %12 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0
  store ptr %1, ptr %12, align 8
    #dbg_declare(ptr %4, !1674, !DIExpression(), !1675)
    #dbg_declare(ptr %5, !1676, !DIExpression(), !1677)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1678, !DIExpression(), !1679)
    #dbg_declare(ptr %7, !1680, !DIExpression(), !1681)
  store i8 1, ptr %7, align 1, !dbg !1681
    #dbg_declare(ptr %8, !1682, !DIExpression(), !1683)
  store i8 1, ptr %8, align 1, !dbg !1683
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %9, ptr align 8 %4, i64 8, i1 false), !dbg !1684
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %10, ptr align 8 %5, i64 8, i1 false), !dbg !1685
  %13 = load ptr, ptr %6, align 8, !dbg !1686
  %14 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %9, i32 0, i32 0, !dbg !1687
  %15 = load ptr, ptr %14, align 8, !dbg !1687
  %16 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %10, i32 0, i32 0, !dbg !1687
  %17 = load ptr, ptr %16, align 8, !dbg !1687
  %18 = call noundef ptr @_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_(ptr %15, ptr %17, ptr noundef %13), !dbg !1687
  ret ptr %18, !dbg !1688
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_(ptr %0, ptr %1, ptr noundef %2) #1 comdat align 2 !dbg !1689 {
  %4 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %5 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %6 = alloca ptr, align 8
  %7 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %8 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %9 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %4, i32 0, i32 0
  store ptr %0, ptr %9, align 8
  %10 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0
  store ptr %1, ptr %10, align 8
    #dbg_declare(ptr %4, !1694, !DIExpression(), !1695)
    #dbg_declare(ptr %5, !1696, !DIExpression(), !1697)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1698, !DIExpression(), !1699)
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %7, ptr align 8 %4, i64 8, i1 false), !dbg !1700
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %8, ptr align 8 %5, i64 8, i1 false), !dbg !1701
  %11 = load ptr, ptr %6, align 8, !dbg !1702
  %12 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %7, i32 0, i32 0, !dbg !1703
  %13 = load ptr, ptr %12, align 8, !dbg !1703
  %14 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %8, i32 0, i32 0, !dbg !1703
  %15 = load ptr, ptr %14, align 8, !dbg !1703
  %16 = call noundef ptr @_ZSt4copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_(ptr %13, ptr %15, ptr noundef %11), !dbg !1703
  ret ptr %16, !dbg !1704
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt4copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_(ptr %0, ptr %1, ptr noundef %2) #1 comdat !dbg !1705 {
  %4 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %5 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %6 = alloca ptr, align 8
  %7 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %8 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %9 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %10 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %11 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %4, i32 0, i32 0
  store ptr %0, ptr %11, align 8
  %12 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0
  store ptr %1, ptr %12, align 8
    #dbg_declare(ptr %4, !1708, !DIExpression(), !1709)
    #dbg_declare(ptr %5, !1710, !DIExpression(), !1711)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1712, !DIExpression(), !1713)
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %8, ptr align 8 %4, i64 8, i1 false), !dbg !1714
  %13 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %8, i32 0, i32 0, !dbg !1715
  %14 = load ptr, ptr %13, align 8, !dbg !1715
  %15 = call ptr @_ZSt12__miter_baseIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEET_S8_(ptr %14), !dbg !1715
  %16 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %7, i32 0, i32 0, !dbg !1715
  store ptr %15, ptr %16, align 8, !dbg !1715
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %10, ptr align 8 %5, i64 8, i1 false), !dbg !1716
  %17 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %10, i32 0, i32 0, !dbg !1717
  %18 = load ptr, ptr %17, align 8, !dbg !1717
  %19 = call ptr @_ZSt12__miter_baseIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEET_S8_(ptr %18), !dbg !1717
  %20 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %9, i32 0, i32 0, !dbg !1717
  store ptr %19, ptr %20, align 8, !dbg !1717
  %21 = load ptr, ptr %6, align 8, !dbg !1718
  %22 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %7, i32 0, i32 0, !dbg !1719
  %23 = load ptr, ptr %22, align 8, !dbg !1719
  %24 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %9, i32 0, i32 0, !dbg !1719
  %25 = load ptr, ptr %24, align 8, !dbg !1719
  %26 = call noundef ptr @_ZSt13__copy_move_aILb0EN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET1_T0_SA_S9_(ptr %23, ptr %25, ptr noundef %21), !dbg !1719
  ret ptr %26, !dbg !1720
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt13__copy_move_aILb0EN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET1_T0_SA_S9_(ptr %0, ptr %1, ptr noundef %2) #1 comdat !dbg !1721 {
  %4 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %5 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %6 = alloca ptr, align 8
  %7 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %8 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %9 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %4, i32 0, i32 0
  store ptr %0, ptr %9, align 8
  %10 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0
  store ptr %1, ptr %10, align 8
    #dbg_declare(ptr %4, !1724, !DIExpression(), !1725)
    #dbg_declare(ptr %5, !1726, !DIExpression(), !1727)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1728, !DIExpression(), !1729)
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %7, ptr align 8 %4, i64 8, i1 false), !dbg !1730
  %11 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %7, i32 0, i32 0, !dbg !1731
  %12 = load ptr, ptr %11, align 8, !dbg !1731
  %13 = call noundef ptr @_ZSt12__niter_baseIPKiSt6vectorIiSaIiEEET_N9__gnu_cxx17__normal_iteratorIS5_T0_EE(ptr %12) #8, !dbg !1731
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %8, ptr align 8 %5, i64 8, i1 false), !dbg !1732
  %14 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %8, i32 0, i32 0, !dbg !1733
  %15 = load ptr, ptr %14, align 8, !dbg !1733
  %16 = call noundef ptr @_ZSt12__niter_baseIPKiSt6vectorIiSaIiEEET_N9__gnu_cxx17__normal_iteratorIS5_T0_EE(ptr %15) #8, !dbg !1733
  %17 = load ptr, ptr %6, align 8, !dbg !1734
  %18 = call noundef ptr @_ZSt12__niter_baseIPiET_S1_(ptr noundef %17) #8, !dbg !1735
  %19 = call noundef ptr @_ZSt14__copy_move_a1ILb0EPKiPiET1_T0_S4_S3_(ptr noundef %13, ptr noundef %16, ptr noundef %18), !dbg !1736
  %20 = call noundef ptr @_ZSt12__niter_wrapIPiET_RKS1_S1_(ptr noundef nonnull align 8 dereferenceable(8) %6, ptr noundef %19), !dbg !1737
  ret ptr %20, !dbg !1738
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local ptr @_ZSt12__miter_baseIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEET_S8_(ptr %0) #0 comdat !dbg !1739 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %3 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %4 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %3, i32 0, i32 0
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %3, !1745, !DIExpression(), !1746)
  call void @llvm.memcpy.p0.p0.i64(ptr align 8 %2, ptr align 8 %3, i64 8, i1 false), !dbg !1747
  %5 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %2, i32 0, i32 0, !dbg !1748
  %6 = load ptr, ptr %5, align 8, !dbg !1748
  ret ptr %6, !dbg !1748
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt12__niter_wrapIPiET_RKS1_S1_(ptr noundef nonnull align 8 dereferenceable(8) %0, ptr noundef %1) #0 comdat !dbg !1749 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1752, !DIExpression(), !1753)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1754, !DIExpression(), !1755)
  %5 = load ptr, ptr %4, align 8, !dbg !1756
  ret ptr %5, !dbg !1757
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt14__copy_move_a1ILb0EPKiPiET1_T0_S4_S3_(ptr noundef %0, ptr noundef %1, ptr noundef %2) #1 comdat !dbg !1758 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1763, !DIExpression(), !1764)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1765, !DIExpression(), !1766)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1767, !DIExpression(), !1768)
  %7 = load ptr, ptr %4, align 8, !dbg !1769
  %8 = load ptr, ptr %5, align 8, !dbg !1770
  %9 = load ptr, ptr %6, align 8, !dbg !1771
  %10 = call noundef ptr @_ZSt14__copy_move_a2ILb0EPKiPiET1_T0_S4_S3_(ptr noundef %7, ptr noundef %8, ptr noundef %9), !dbg !1772
  ret ptr %10, !dbg !1773
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt12__niter_baseIPKiSt6vectorIiSaIiEEET_N9__gnu_cxx17__normal_iteratorIS5_T0_EE(ptr %0) #0 comdat !dbg !1774 {
  %2 = alloca %"class.__gnu_cxx::__normal_iterator.0", align 8
  %3 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %2, i32 0, i32 0
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %2, !1777, !DIExpression(), !1778)
  %4 = call noundef nonnull align 8 dereferenceable(8) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv(ptr noundef nonnull align 8 dereferenceable(8) %2) #8, !dbg !1779
  %5 = load ptr, ptr %4, align 8, !dbg !1779
  ret ptr %5, !dbg !1780
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt12__niter_baseIPiET_S1_(ptr noundef %0) #0 comdat !dbg !1781 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1784, !DIExpression(), !1785)
  %3 = load ptr, ptr %2, align 8, !dbg !1786
  ret ptr %3, !dbg !1787
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZSt14__copy_move_a2ILb0EPKiPiET1_T0_S4_S3_(ptr noundef %0, ptr noundef %1, ptr noundef %2) #1 comdat !dbg !1788 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1789, !DIExpression(), !1790)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1791, !DIExpression(), !1792)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1793, !DIExpression(), !1794)
  %7 = load ptr, ptr %4, align 8, !dbg !1795
  %8 = load ptr, ptr %5, align 8, !dbg !1796
  %9 = load ptr, ptr %6, align 8, !dbg !1797
  %10 = call noundef ptr @_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_(ptr noundef %7, ptr noundef %8, ptr noundef %9), !dbg !1798
  ret ptr %10, !dbg !1799
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local noundef ptr @_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_(ptr noundef %0, ptr noundef %1, ptr noundef %2) #1 comdat align 2 !dbg !1800 {
  %4 = alloca ptr, align 8
  %5 = alloca ptr, align 8
  %6 = alloca ptr, align 8
  %7 = alloca i64, align 8
  store ptr %0, ptr %4, align 8
    #dbg_declare(ptr %4, !1809, !DIExpression(), !1810)
  store ptr %1, ptr %5, align 8
    #dbg_declare(ptr %5, !1811, !DIExpression(), !1812)
  store ptr %2, ptr %6, align 8
    #dbg_declare(ptr %6, !1813, !DIExpression(), !1814)
    #dbg_declare(ptr %7, !1815, !DIExpression(), !1817)
  %8 = load ptr, ptr %5, align 8, !dbg !1818
  %9 = load ptr, ptr %4, align 8, !dbg !1819
  %10 = ptrtoint ptr %8 to i64, !dbg !1820
  %11 = ptrtoint ptr %9 to i64, !dbg !1820
  %12 = sub i64 %10, %11, !dbg !1820
  %13 = sdiv exact i64 %12, 4, !dbg !1820
  store i64 %13, ptr %7, align 8, !dbg !1817
  %14 = load i64, ptr %7, align 8, !dbg !1821
  %15 = icmp sgt i64 %14, 1, !dbg !1823
  br i1 %15, label %16, label %21, !dbg !1824

16:                                               ; preds = %3
  %17 = load ptr, ptr %6, align 8, !dbg !1825
  %18 = load ptr, ptr %4, align 8, !dbg !1826
  %19 = load i64, ptr %7, align 8, !dbg !1827
  %20 = mul i64 4, %19, !dbg !1828
  call void @llvm.memmove.p0.p0.i64(ptr align 4 %17, ptr align 4 %18, i64 %20, i1 false), !dbg !1829
  br label %28, !dbg !1829

21:                                               ; preds = %3
  %22 = load i64, ptr %7, align 8, !dbg !1830
  %23 = icmp eq i64 %22, 1, !dbg !1832
  br i1 %23, label %24, label %27, !dbg !1832

24:                                               ; preds = %21
  %25 = load ptr, ptr %6, align 8, !dbg !1833
  %26 = load ptr, ptr %4, align 8, !dbg !1834
  call void @_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_(ptr noundef %25, ptr noundef %26), !dbg !1835
  br label %27, !dbg !1835

27:                                               ; preds = %24, %21
  br label %28

28:                                               ; preds = %27, %16
  %29 = load ptr, ptr %6, align 8, !dbg !1836
  %30 = load i64, ptr %7, align 8, !dbg !1837
  %31 = getelementptr inbounds i32, ptr %29, i64 %30, !dbg !1838
  ret ptr %31, !dbg !1839
}

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(argmem: readwrite)
declare void @llvm.memmove.p0.p0.i64(ptr writeonly captures(none), ptr readonly captures(none), i64, i1 immarg) #2

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_(ptr noundef %0, ptr noundef %1) #0 comdat align 2 !dbg !1840 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1849, !DIExpression(), !1850)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1851, !DIExpression(), !1852)
  %5 = load ptr, ptr %4, align 8, !dbg !1853
  %6 = load i32, ptr %5, align 4, !dbg !1854
  %7 = load ptr, ptr %3, align 8, !dbg !1855
  store i32 %6, ptr %7, align 4, !dbg !1856
  ret void, !dbg !1857
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local noundef nonnull align 8 dereferenceable(8) ptr @_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv(ptr noundef nonnull align 8 dereferenceable(8) %0) #0 comdat align 2 !dbg !1858 {
  %2 = alloca ptr, align 8
  store ptr %0, ptr %2, align 8
    #dbg_declare(ptr %2, !1859, !DIExpression(), !1861)
  %3 = load ptr, ptr %2, align 8
  %4 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %3, i32 0, i32 0, !dbg !1862
  ret ptr %4, !dbg !1863
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC2ERKS2_(ptr noundef nonnull align 8 dereferenceable(8) %0, ptr noundef nonnull align 8 dereferenceable(8) %1) unnamed_addr #0 comdat align 2 !dbg !1864 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1865, !DIExpression(), !1867)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1868, !DIExpression(), !1869)
  %5 = load ptr, ptr %3, align 8
  %6 = getelementptr inbounds nuw %"class.__gnu_cxx::__normal_iterator.0", ptr %5, i32 0, i32 0, !dbg !1870
  %7 = load ptr, ptr %4, align 8, !dbg !1871, !nonnull !138, !align !667
  %8 = load ptr, ptr %7, align 8, !dbg !1871
  store ptr %8, ptr %6, align 8, !dbg !1870
  ret void, !dbg !1872
}

; Function Attrs: mustprogress noinline optnone uwtable
define linkonce_odr dso_local void @_ZSt8_DestroyIPiEvT_S1_(ptr noundef %0, ptr noundef %1) #1 comdat !dbg !1873 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1877, !DIExpression(), !1878)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1879, !DIExpression(), !1880)
  %5 = load ptr, ptr %3, align 8, !dbg !1881
  %6 = load ptr, ptr %4, align 8, !dbg !1882
  call void @_ZNSt12_Destroy_auxILb1EE9__destroyIPiEEvT_S3_(ptr noundef %5, ptr noundef %6), !dbg !1883
  ret void, !dbg !1884
}

; Function Attrs: mustprogress noinline nounwind optnone uwtable
define linkonce_odr dso_local void @_ZNSt12_Destroy_auxILb1EE9__destroyIPiEEvT_S3_(ptr noundef %0, ptr noundef %1) #0 comdat align 2 !dbg !1885 {
  %3 = alloca ptr, align 8
  %4 = alloca ptr, align 8
  store ptr %0, ptr %3, align 8
    #dbg_declare(ptr %3, !1889, !DIExpression(), !1890)
  store ptr %1, ptr %4, align 8
    #dbg_declare(ptr %4, !1891, !DIExpression(), !1892)
  ret void, !dbg !1893
}

; Function Attrs: nocallback nofree nosync nounwind willreturn memory(inaccessiblemem: readwrite)
declare void @llvm.experimental.noalias.scope.decl(metadata) #7

attributes #0 = { mustprogress noinline nounwind optnone uwtable "frame-pointer"="all" "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #1 = { mustprogress noinline optnone uwtable "frame-pointer"="all" "min-legal-vector-width"="0" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #2 = { nocallback nofree nosync nounwind willreturn memory(argmem: readwrite) }
attributes #3 = { noreturn "frame-pointer"="all" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #4 = { noinline noreturn nounwind uwtable "frame-pointer"="all" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #5 = { nobuiltin allocsize(0) "frame-pointer"="all" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #6 = { nobuiltin nounwind "frame-pointer"="all" "no-trapping-math"="true" "stack-protector-buffer-size"="8" "target-cpu"="x86-64" "target-features"="+cmov,+cx8,+fxsr,+mmx,+sse,+sse2,+x87" "tune-cpu"="generic" }
attributes #7 = { nocallback nofree nosync nounwind willreturn memory(inaccessiblemem: readwrite) }
attributes #8 = { nounwind }
attributes #9 = { noreturn nounwind }
attributes #10 = { noreturn }
attributes #11 = { builtin allocsize(0) }
attributes #12 = { builtin nounwind }

!llvm.dbg.cu = !{!8}
!llvm.module.flags = !{!639, !640, !641, !642, !643, !644}
!llvm.ident = !{!645}

!0 = !DIGlobalVariableExpression(var: !1, expr: !DIExpression())
!1 = distinct !DIGlobalVariable(scope: null, file: !2, line: 1911, type: !3, isLocal: true, isDefinition: true)
!2 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_vector.h", directory: "", checksumkind: CSK_MD5, checksum: "514164964ac06e2061e9e779d8cf420e")
!3 = !DICompositeType(tag: DW_TAG_array_type, baseType: !4, size: 392, elements: !6)
!4 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !5)
!5 = !DIBasicType(name: "char", size: 8, encoding: DW_ATE_signed_char)
!6 = !{!7}
!7 = !DISubrange(count: 49)
!8 = distinct !DICompileUnit(language: DW_LANG_C_plus_plus_14, file: !9, producer: "Ubuntu clang version 23.1.4 (++20261018124056+71c76755a8ff-1~exp1~20261018124211.83)", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug, retainedTypes: !10, globals: !623, imports: !624, splitDebugInlining: false, nameTableKind: None)
!9 = !DIFile(filename: "prototype/fixtures/fold_recurrence.cpp", directory: "/home/huawei/fold-state-jump-research", checksumkind: CSK_MD5, checksum: "f85ce546af87965d97eed5ffb2046c4d")
!10 = !{!11, !620, !276, !69, !39, !622, !356, !198, !296, !419, !49, !43, !141, !21, !18, !14, !357, !420}
!11 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Box", file: !9, line: 12, size: 320, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !12, identifier: "_ZTS3Box")
!12 = !{!13, !614, !619}
!13 = !DIDerivedType(tag: DW_TAG_member, name: "payload", scope: !11, file: !9, line: 13, baseType: !14, size: 192)
!14 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "vector<int, std::allocator<int> >", scope: !15, file: !2, line: 428, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !16, templateParams: !612, identifier: "_ZTSSt6vectorIiSaIiEE")
!15 = !DINamespace(name: "std", scope: null)
!16 = !{!17, !235, !254, !270, !271, !277, !280, !283, !287, !293, !297, !303, !308, !312, !322, !325, !328, !331, !336, !337, !341, !344, !347, !350, !353, !416, !477, !478, !479, !484, !489, !490, !491, !492, !493, !494, !495, !498, !499, !502, !503, !504, !505, !508, !509, !517, !524, !527, !528, !529, !532, !535, !536, !537, !540, !543, !546, !550, !551, !554, !557, !560, !563, !566, !569, !572, !573, !574, !575, !576, !579, !580, !583, !584, !585, !589, !592, !597, !600, !603, !606, !609}
!17 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !14, baseType: !18, flags: DIFlagProtected, extraData: i32 0)
!18 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_base<int, std::allocator<int> >", scope: !15, file: !2, line: 85, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !19, templateParams: !234, identifier: "_ZTSSt12_Vector_baseIiSaIiEE")
!19 = !{!20, !185, !190, !195, !199, !202, !207, !210, !213, !217, !220, !223, !226, !227, !230, !233}
!20 = !DIDerivedType(tag: DW_TAG_member, name: "_M_impl", scope: !18, file: !2, line: 374, baseType: !21, size: 192)
!21 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_impl", scope: !18, file: !2, line: 133, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !22, identifier: "_ZTSNSt12_Vector_baseIiSaIiEE12_Vector_implE")
!22 = !{!23, !140, !165, !169, !174, !178, !182}
!23 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !21, baseType: !24, extraData: i32 0)
!24 = !DIDerivedType(tag: DW_TAG_typedef, name: "_Tp_alloc_type", scope: !18, file: !2, line: 88, baseType: !25)
!25 = !DIDerivedType(tag: DW_TAG_typedef, name: "other", scope: !27, file: !26, line: 126, baseType: !139)
!26 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/ext/alloc_traits.h", directory: "")
!27 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "rebind<int>", scope: !28, file: !26, line: 125, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !81, identifier: "_ZTSN9__gnu_cxx14__alloc_traitsISaIiEiE6rebindIiEE")
!28 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__alloc_traits<std::allocator<int>, int>", scope: !29, file: !26, line: 45, size: 8, flags: DIFlagTypePassByValue, elements: !30, templateParams: !136, identifier: "_ZTSN9__gnu_cxx14__alloc_traitsISaIiEiEE")
!29 = !DINamespace(name: "__gnu_cxx", scope: null)
!30 = !{!31, !122, !125, !128, !132, !133, !134, !135}
!31 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !28, baseType: !32, extraData: i32 0)
!32 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "allocator_traits<std::allocator<int> >", scope: !15, file: !33, line: 428, size: 8, flags: DIFlagTypePassByValue, elements: !34, templateParams: !120, identifier: "_ZTSSt16allocator_traitsISaIiEE")
!33 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/alloc_traits.h", directory: "", checksumkind: CSK_MD5, checksum: "ba5569b3568669c1c77efc18640dd1aa")
!34 = !{!35, !104, !108, !111, !117}
!35 = !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_m", scope: !32, file: !33, line: 481, type: !36, scopeLine: 481, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!36 = !DISubroutineType(types: !37)
!37 = !{!38, !41, !103}
!38 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !32, file: !33, line: 437, baseType: !39)
!39 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !40, size: 64)
!40 = !DIBasicType(name: "int", size: 32, encoding: DW_ATE_signed)
!41 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !42, size: 64)
!42 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !32, file: !33, line: 431, baseType: !43)
!43 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "allocator<int>", scope: !15, file: !44, line: 130, size: 8, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !45, templateParams: !81, identifier: "_ZTSSaIiE")
!44 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "9c5b773ad00830bea46f2a8fa4ac22e7")
!45 = !{!46, !83, !87, !92, !96, !97, !100}
!46 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !43, baseType: !47, flags: DIFlagPublic, extraData: i32 0)
!47 = !DIDerivedType(tag: DW_TAG_typedef, name: "__allocator_base<int>", scope: !15, file: !48, line: 47, baseType: !49)
!48 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/x86_64-linux-gnu/c++/13/bits/c++allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "f56d3b48d132e35738b60e08703928ec")
!49 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__new_allocator<int>", scope: !15, file: !50, line: 63, size: 8, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !51, templateParams: !81, identifier: "_ZTSSt15__new_allocatorIiE")
!50 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/new_allocator.h", directory: "", checksumkind: CSK_MD5, checksum: "c7892ebb1170c1f49c5be98396a83230")
!51 = !{!52, !56, !61, !65, !74, !77}
!52 = !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC4Ev", scope: !49, file: !50, line: 88, type: !53, scopeLine: 88, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!53 = !DISubroutineType(types: !54)
!54 = !{null, !55}
!55 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !49, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!56 = !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC4ERKS0_", scope: !49, file: !50, line: 92, type: !57, scopeLine: 92, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!57 = !DISubroutineType(types: !58)
!58 = !{null, !55, !59}
!59 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !60, size: 64)
!60 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !49)
!61 = !DISubprogram(name: "operator=", linkageName: "_ZNSt15__new_allocatorIiEaSERKS0_", scope: !49, file: !50, line: 100, type: !62, scopeLine: 100, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!62 = !DISubroutineType(types: !63)
!63 = !{!64, !55, !59}
!64 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !49, size: 64)
!65 = !DISubprogram(name: "allocate", linkageName: "_ZNSt15__new_allocatorIiE8allocateEmPKv", scope: !49, file: !50, line: 126, type: !66, scopeLine: 126, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!66 = !DISubroutineType(types: !67)
!67 = !{!39, !55, !68, !72}
!68 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !49, file: !50, line: 67, baseType: !69, flags: DIFlagPublic)
!69 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", scope: !15, file: !70, line: 308, baseType: !71)
!70 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/x86_64-linux-gnu/c++/13/bits/c++config.h", directory: "", checksumkind: CSK_MD5, checksum: "449d6dbeca4f3eea299d97c24eb9ed95")
!71 = !DIBasicType(name: "unsigned long", size: 64, encoding: DW_ATE_unsigned)
!72 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !73, size: 64)
!73 = !DIDerivedType(tag: DW_TAG_const_type, baseType: null)
!74 = !DISubprogram(name: "deallocate", linkageName: "_ZNSt15__new_allocatorIiE10deallocateEPim", scope: !49, file: !50, line: 156, type: !75, scopeLine: 156, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!75 = !DISubroutineType(types: !76)
!76 = !{null, !55, !39, !68}
!77 = !DISubprogram(name: "_M_max_size", linkageName: "_ZNKSt15__new_allocatorIiE11_M_max_sizeEv", scope: !49, file: !50, line: 230, type: !78, scopeLine: 230, flags: DIFlagPrototyped, spFlags: 0)
!78 = !DISubroutineType(types: !79)
!79 = !{!68, !80}
!80 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !60, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!81 = !{!82}
!82 = !DITemplateTypeParameter(name: "_Tp", type: !40)
!83 = !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC4Ev", scope: !43, file: !44, line: 163, type: !84, scopeLine: 163, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!84 = !DISubroutineType(types: !85)
!85 = !{null, !86}
!86 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !43, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!87 = !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC4ERKS_", scope: !43, file: !44, line: 167, type: !88, scopeLine: 167, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!88 = !DISubroutineType(types: !89)
!89 = !{null, !86, !90}
!90 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !91, size: 64)
!91 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !43)
!92 = !DISubprogram(name: "operator=", linkageName: "_ZNSaIiEaSERKS_", scope: !43, file: !44, line: 172, type: !93, scopeLine: 172, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!93 = !DISubroutineType(types: !94)
!94 = !{!95, !86, !90}
!95 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !43, size: 64)
!96 = !DISubprogram(name: "~allocator", linkageName: "_ZNSaIiED4Ev", scope: !43, file: !44, line: 184, type: !84, scopeLine: 184, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!97 = !DISubprogram(name: "allocate", linkageName: "_ZNSaIiE8allocateEm", scope: !43, file: !44, line: 189, type: !98, scopeLine: 189, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!98 = !DISubroutineType(types: !99)
!99 = !{!39, !86, !69}
!100 = !DISubprogram(name: "deallocate", linkageName: "_ZNSaIiE10deallocateEPim", scope: !43, file: !44, line: 203, type: !101, scopeLine: 203, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!101 = !DISubroutineType(types: !102)
!102 = !{null, !86, !39, !69}
!103 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", file: !33, line: 452, baseType: !69)
!104 = !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_mPKv", scope: !32, file: !33, line: 496, type: !105, scopeLine: 496, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!105 = !DISubroutineType(types: !106)
!106 = !{!38, !41, !103, !107}
!107 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_void_pointer", file: !33, line: 446, baseType: !72)
!108 = !DISubprogram(name: "deallocate", linkageName: "_ZNSt16allocator_traitsISaIiEE10deallocateERS0_Pim", scope: !32, file: !33, line: 516, type: !109, scopeLine: 516, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!109 = !DISubroutineType(types: !110)
!110 = !{null, !41, !38, !103}
!111 = !DISubprogram(name: "max_size", linkageName: "_ZNSt16allocator_traitsISaIiEE8max_sizeERKS0_", scope: !32, file: !33, line: 571, type: !112, scopeLine: 571, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!112 = !DISubroutineType(types: !113)
!113 = !{!114, !115}
!114 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !32, file: !33, line: 452, baseType: !69)
!115 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !116, size: 64)
!116 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !42)
!117 = !DISubprogram(name: "select_on_container_copy_construction", linkageName: "_ZNSt16allocator_traitsISaIiEE37select_on_container_copy_constructionERKS0_", scope: !32, file: !33, line: 587, type: !118, scopeLine: 587, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!118 = !DISubroutineType(types: !119)
!119 = !{!42, !115}
!120 = !{!121}
!121 = !DITemplateTypeParameter(name: "_Alloc", type: !43)
!122 = !DISubprogram(name: "_S_select_on_copy", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE17_S_select_on_copyERKS1_", scope: !28, file: !26, line: 97, type: !123, scopeLine: 97, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!123 = !DISubroutineType(types: !124)
!124 = !{!43, !90}
!125 = !DISubprogram(name: "_S_on_swap", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE10_S_on_swapERS1_S3_", scope: !28, file: !26, line: 101, type: !126, scopeLine: 101, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!126 = !DISubroutineType(types: !127)
!127 = !{null, !95, !95}
!128 = !DISubprogram(name: "_S_propagate_on_copy_assign", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE27_S_propagate_on_copy_assignEv", scope: !28, file: !26, line: 105, type: !129, scopeLine: 105, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!129 = !DISubroutineType(types: !130)
!130 = !{!131}
!131 = !DIBasicType(name: "bool", size: 8, encoding: DW_ATE_boolean)
!132 = !DISubprogram(name: "_S_propagate_on_move_assign", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE27_S_propagate_on_move_assignEv", scope: !28, file: !26, line: 109, type: !129, scopeLine: 109, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!133 = !DISubprogram(name: "_S_propagate_on_swap", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE20_S_propagate_on_swapEv", scope: !28, file: !26, line: 113, type: !129, scopeLine: 113, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!134 = !DISubprogram(name: "_S_always_equal", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE15_S_always_equalEv", scope: !28, file: !26, line: 117, type: !129, scopeLine: 117, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!135 = !DISubprogram(name: "_S_nothrow_move", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE15_S_nothrow_moveEv", scope: !28, file: !26, line: 121, type: !129, scopeLine: 121, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!136 = !{!121, !137}
!137 = !DITemplateTypeParameter(type: !40, defaulted: true)
!138 = !{}
!139 = !DIDerivedType(tag: DW_TAG_typedef, name: "rebind_alloc<int>", scope: !32, file: !33, line: 467, baseType: !43)
!140 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !21, baseType: !141, extraData: i32 0)
!141 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Vector_impl_data", scope: !18, file: !2, line: 92, size: 192, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !142, identifier: "_ZTSNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataE")
!142 = !{!143, !146, !147, !148, !152, !156, !161}
!143 = !DIDerivedType(tag: DW_TAG_member, name: "_M_start", scope: !141, file: !2, line: 94, baseType: !144, size: 64)
!144 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !18, file: !2, line: 90, baseType: !145)
!145 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !28, file: !26, line: 54, baseType: !38)
!146 = !DIDerivedType(tag: DW_TAG_member, name: "_M_finish", scope: !141, file: !2, line: 95, baseType: !144, size: 64, offset: 64)
!147 = !DIDerivedType(tag: DW_TAG_member, name: "_M_end_of_storage", scope: !141, file: !2, line: 96, baseType: !144, size: 64, offset: 128)
!148 = !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC4Ev", scope: !141, file: !2, line: 99, type: !149, scopeLine: 99, flags: DIFlagPrototyped, spFlags: 0)
!149 = !DISubroutineType(types: !150)
!150 = !{null, !151}
!151 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !141, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!152 = !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC4EOS2_", scope: !141, file: !2, line: 105, type: !153, scopeLine: 105, flags: DIFlagPrototyped, spFlags: 0)
!153 = !DISubroutineType(types: !154)
!154 = !{null, !151, !155}
!155 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !141, size: 64)
!156 = !DISubprogram(name: "_M_copy_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_", scope: !141, file: !2, line: 113, type: !157, scopeLine: 113, flags: DIFlagPrototyped, spFlags: 0)
!157 = !DISubroutineType(types: !158)
!158 = !{null, !151, !159}
!159 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !160, size: 64)
!160 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !141)
!161 = !DISubprogram(name: "_M_swap_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_", scope: !141, file: !2, line: 122, type: !162, scopeLine: 122, flags: DIFlagPrototyped, spFlags: 0)
!162 = !DISubroutineType(types: !163)
!163 = !{null, !151, !164}
!164 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !141, size: 64)
!165 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EvQ26is_default_constructible_vIN9__gnu_cxx14__alloc_traitsIT0_NS5_10value_typeEE6rebindIT_E5otherEE", scope: !21, file: !2, line: 137, type: !166, scopeLine: 137, flags: DIFlagPrototyped, spFlags: 0)
!166 = !DISubroutineType(types: !167)
!167 = !{null, !168}
!168 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !21, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!169 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4ERKS0_", scope: !21, file: !2, line: 146, type: !170, scopeLine: 146, flags: DIFlagPrototyped, spFlags: 0)
!170 = !DISubroutineType(types: !171)
!171 = !{null, !168, !172}
!172 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !173, size: 64)
!173 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !24)
!174 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS2_", scope: !21, file: !2, line: 154, type: !175, scopeLine: 154, flags: DIFlagPrototyped, spFlags: 0)
!175 = !DISubroutineType(types: !176)
!176 = !{null, !168, !177}
!177 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !21, size: 64)
!178 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS0_", scope: !21, file: !2, line: 159, type: !179, scopeLine: 159, flags: DIFlagPrototyped, spFlags: 0)
!179 = !DISubroutineType(types: !180)
!180 = !{null, !168, !181}
!181 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !24, size: 64)
!182 = !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC4EOS0_OS2_", scope: !21, file: !2, line: 164, type: !183, scopeLine: 164, flags: DIFlagPrototyped, spFlags: 0)
!183 = !DISubroutineType(types: !184)
!184 = !{null, !168, !181, !177}
!185 = !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 301, type: !186, scopeLine: 301, flags: DIFlagPrototyped, spFlags: 0)
!186 = !DISubroutineType(types: !187)
!187 = !{!188, !189}
!188 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !24, size: 64)
!189 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !18, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!190 = !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 306, type: !191, scopeLine: 306, flags: DIFlagPrototyped, spFlags: 0)
!191 = !DISubroutineType(types: !192)
!192 = !{!172, !193}
!193 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !194, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!194 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !18)
!195 = !DISubprogram(name: "get_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv", scope: !18, file: !2, line: 311, type: !196, scopeLine: 311, flags: DIFlagPrototyped, spFlags: 0)
!196 = !DISubroutineType(types: !197)
!197 = !{!198, !193}
!198 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !18, file: !2, line: 297, baseType: !43)
!199 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4Ev", scope: !18, file: !2, line: 315, type: !200, scopeLine: 315, flags: DIFlagPrototyped, spFlags: 0)
!200 = !DISubroutineType(types: !201)
!201 = !{null, !189}
!202 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4ERKS0_", scope: !18, file: !2, line: 321, type: !203, scopeLine: 321, flags: DIFlagPrototyped, spFlags: 0)
!203 = !DISubroutineType(types: !204)
!204 = !{null, !189, !205}
!205 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !206, size: 64)
!206 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !198)
!207 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4Em", scope: !18, file: !2, line: 327, type: !208, scopeLine: 327, flags: DIFlagPrototyped, spFlags: 0)
!208 = !DISubroutineType(types: !209)
!209 = !{null, !189, !69}
!210 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EmRKS0_", scope: !18, file: !2, line: 333, type: !211, scopeLine: 333, flags: DIFlagPrototyped, spFlags: 0)
!211 = !DISubroutineType(types: !212)
!212 = !{null, !189, !69, !205}
!213 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS1_", scope: !18, file: !2, line: 338, type: !214, scopeLine: 338, flags: DIFlagPrototyped, spFlags: 0)
!214 = !DISubroutineType(types: !215)
!215 = !{null, !189, !216}
!216 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !18, size: 64)
!217 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS0_", scope: !18, file: !2, line: 343, type: !218, scopeLine: 343, flags: DIFlagPrototyped, spFlags: 0)
!218 = !DISubroutineType(types: !219)
!219 = !{null, !189, !181}
!220 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4EOS1_RKS0_", scope: !18, file: !2, line: 347, type: !221, scopeLine: 347, flags: DIFlagPrototyped, spFlags: 0)
!221 = !DISubroutineType(types: !222)
!222 = !{null, !189, !216, !205}
!223 = !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC4ERKS0_OS1_", scope: !18, file: !2, line: 361, type: !224, scopeLine: 361, flags: DIFlagPrototyped, spFlags: 0)
!224 = !DISubroutineType(types: !225)
!225 = !{null, !189, !205, !216}
!226 = !DISubprogram(name: "~_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEED4Ev", scope: !18, file: !2, line: 367, type: !200, scopeLine: 367, flags: DIFlagPrototyped, spFlags: 0)
!227 = !DISubprogram(name: "_M_allocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm", scope: !18, file: !2, line: 378, type: !228, scopeLine: 378, flags: DIFlagPrototyped, spFlags: 0)
!228 = !DISubroutineType(types: !229)
!229 = !{!144, !189, !69}
!230 = !DISubprogram(name: "_M_deallocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim", scope: !18, file: !2, line: 386, type: !231, scopeLine: 386, flags: DIFlagPrototyped, spFlags: 0)
!231 = !DISubroutineType(types: !232)
!232 = !{null, !189, !144, !69}
!233 = !DISubprogram(name: "_M_create_storage", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm", scope: !18, file: !2, line: 396, type: !208, scopeLine: 396, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!234 = !{!82, !121}
!235 = !DISubprogram(name: "_S_nothrow_relocate", linkageName: "_ZNSt6vectorIiSaIiEE19_S_nothrow_relocateESt17integral_constantIbLb1EE", scope: !14, file: !2, line: 470, type: !236, scopeLine: 470, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!236 = !DISubroutineType(types: !237)
!237 = !{!131, !238}
!238 = !DIDerivedType(tag: DW_TAG_typedef, name: "true_type", scope: !15, file: !239, line: 82, baseType: !240)
!239 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/type_traits", directory: "")
!240 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "integral_constant<bool, true>", scope: !15, file: !239, line: 62, size: 8, flags: DIFlagTypePassByValue, elements: !241, templateParams: !251, identifier: "_ZTSSt17integral_constantIbLb1EE")
!241 = !{!242, !244, !250}
!242 = !DIDerivedType(tag: DW_TAG_variable, name: "value", scope: !240, file: !239, line: 64, baseType: !243, flags: DIFlagStaticMember, extraData: i1 true)
!243 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !131)
!244 = !DISubprogram(name: "operator bool", linkageName: "_ZNKSt17integral_constantIbLb1EEcvbEv", scope: !240, file: !239, line: 67, type: !245, scopeLine: 67, flags: DIFlagPrototyped, spFlags: 0)
!245 = !DISubroutineType(types: !246)
!246 = !{!247, !248}
!247 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !240, file: !239, line: 65, baseType: !131)
!248 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !249, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!249 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !240)
!250 = !DISubprogram(name: "operator()", linkageName: "_ZNKSt17integral_constantIbLb1EEclEv", scope: !240, file: !239, line: 72, type: !245, scopeLine: 72, flags: DIFlagPrototyped, spFlags: 0)
!251 = !{!252, !253}
!252 = !DITemplateTypeParameter(name: "_Tp", type: !131)
!253 = !DITemplateValueParameter(name: "__v", type: !131, value: i1 true)
!254 = !DISubprogram(name: "_S_nothrow_relocate", linkageName: "_ZNSt6vectorIiSaIiEE19_S_nothrow_relocateESt17integral_constantIbLb0EE", scope: !14, file: !2, line: 479, type: !255, scopeLine: 479, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!255 = !DISubroutineType(types: !256)
!256 = !{!131, !257}
!257 = !DIDerivedType(tag: DW_TAG_typedef, name: "false_type", scope: !15, file: !239, line: 85, baseType: !258)
!258 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "integral_constant<bool, false>", scope: !15, file: !239, line: 62, size: 8, flags: DIFlagTypePassByValue, elements: !259, templateParams: !268, identifier: "_ZTSSt17integral_constantIbLb0EE")
!259 = !{!260, !261, !267}
!260 = !DIDerivedType(tag: DW_TAG_variable, name: "value", scope: !258, file: !239, line: 64, baseType: !243, flags: DIFlagStaticMember, extraData: i1 false)
!261 = !DISubprogram(name: "operator bool", linkageName: "_ZNKSt17integral_constantIbLb0EEcvbEv", scope: !258, file: !239, line: 67, type: !262, scopeLine: 67, flags: DIFlagPrototyped, spFlags: 0)
!262 = !DISubroutineType(types: !263)
!263 = !{!264, !265}
!264 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !258, file: !239, line: 65, baseType: !131)
!265 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !266, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!266 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !258)
!267 = !DISubprogram(name: "operator()", linkageName: "_ZNKSt17integral_constantIbLb0EEclEv", scope: !258, file: !239, line: 72, type: !262, scopeLine: 72, flags: DIFlagPrototyped, spFlags: 0)
!268 = !{!252, !269}
!269 = !DITemplateValueParameter(name: "__v", type: !131, value: i1 false)
!270 = !DISubprogram(name: "_S_use_relocate", linkageName: "_ZNSt6vectorIiSaIiEE15_S_use_relocateEv", scope: !14, file: !2, line: 483, type: !129, scopeLine: 483, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!271 = !DISubprogram(name: "_S_do_relocate", linkageName: "_ZNSt6vectorIiSaIiEE14_S_do_relocateEPiS2_S2_RS0_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 492, type: !272, scopeLine: 492, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!272 = !DISubroutineType(types: !273)
!273 = !{!274, !274, !274, !274, !275, !238}
!274 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !14, file: !2, line: 454, baseType: !144, flags: DIFlagPublic)
!275 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !276, size: 64)
!276 = !DIDerivedType(tag: DW_TAG_typedef, name: "_Tp_alloc_type", scope: !14, file: !2, line: 449, baseType: !24)
!277 = !DISubprogram(name: "_S_do_relocate", linkageName: "_ZNSt6vectorIiSaIiEE14_S_do_relocateEPiS2_S2_RS0_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 499, type: !278, scopeLine: 499, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!278 = !DISubroutineType(types: !279)
!279 = !{!274, !274, !274, !274, !275, !257}
!280 = !DISubprogram(name: "_S_relocate", linkageName: "_ZNSt6vectorIiSaIiEE11_S_relocateEPiS2_S2_RS0_", scope: !14, file: !2, line: 504, type: !281, scopeLine: 504, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!281 = !DISubroutineType(types: !282)
!282 = !{!274, !274, !274, !274, !275}
!283 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4Ev", scope: !14, file: !2, line: 531, type: !284, scopeLine: 531, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!284 = !DISubroutineType(types: !285)
!285 = !{null, !286}
!286 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !14, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!287 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS0_", scope: !14, file: !2, line: 542, type: !288, scopeLine: 542, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: 0)
!288 = !DISubroutineType(types: !289)
!289 = !{null, !286, !290}
!290 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !291, size: 64)
!291 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !292)
!292 = !DIDerivedType(tag: DW_TAG_typedef, name: "allocator_type", scope: !14, file: !2, line: 465, baseType: !43, flags: DIFlagPublic)
!293 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EmRKS0_", scope: !14, file: !2, line: 556, type: !294, scopeLine: 556, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: 0)
!294 = !DISubroutineType(types: !295)
!295 = !{null, !286, !296, !290}
!296 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_type", scope: !14, file: !2, line: 463, baseType: !69, flags: DIFlagPublic)
!297 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EmRKiRKS0_", scope: !14, file: !2, line: 569, type: !298, scopeLine: 569, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!298 = !DISubroutineType(types: !299)
!299 = !{null, !286, !296, !300, !290}
!300 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !301, size: 64)
!301 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !302)
!302 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !14, file: !2, line: 453, baseType: !40, flags: DIFlagPublic)
!303 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS1_", scope: !14, file: !2, line: 601, type: !304, scopeLine: 601, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!304 = !DISubroutineType(types: !305)
!305 = !{null, !286, !306}
!306 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !307, size: 64)
!307 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !14)
!308 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_", scope: !14, file: !2, line: 620, type: !309, scopeLine: 620, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!309 = !DISubroutineType(types: !310)
!310 = !{null, !286, !311}
!311 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !14, size: 64)
!312 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ERKS1_RKS0_", scope: !14, file: !2, line: 624, type: !313, scopeLine: 624, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!313 = !DISubroutineType(types: !314)
!314 = !{null, !286, !306, !315}
!315 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !316, size: 64)
!316 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !317)
!317 = !DIDerivedType(tag: DW_TAG_typedef, name: "__type_identity_t<std::allocator<int> >", scope: !15, file: !239, line: 143, baseType: !318)
!318 = !DIDerivedType(tag: DW_TAG_typedef, name: "type", scope: !319, file: !239, line: 140, baseType: !43)
!319 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__type_identity<std::allocator<int> >", scope: !15, file: !239, line: 139, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !320, identifier: "_ZTSSt15__type_identityISaIiEE")
!320 = !{!321}
!321 = !DITemplateTypeParameter(name: "_Type", type: !43)
!322 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 635, type: !323, scopeLine: 635, flags: DIFlagPrototyped, spFlags: 0)
!323 = !DISubroutineType(types: !324)
!324 = !{null, !286, !311, !290, !238}
!325 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 640, type: !326, scopeLine: 640, flags: DIFlagPrototyped, spFlags: 0)
!326 = !DISubroutineType(types: !327)
!327 = !{null, !286, !311, !290, !257}
!328 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4EOS1_RKS0_", scope: !14, file: !2, line: 659, type: !329, scopeLine: 659, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!329 = !DISubroutineType(types: !330)
!330 = !{null, !286, !311, !315}
!331 = !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC4ESt16initializer_listIiERKS0_", scope: !14, file: !2, line: 678, type: !332, scopeLine: 678, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!332 = !DISubroutineType(types: !333)
!333 = !{null, !286, !334, !290}
!334 = !DICompositeType(tag: DW_TAG_class_type, name: "initializer_list<int>", scope: !15, file: !335, line: 45, size: 128, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16initializer_listIiE")
!335 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/initializer_list", directory: "")
!336 = !DISubprogram(name: "~vector", linkageName: "_ZNSt6vectorIiSaIiEED4Ev", scope: !14, file: !2, line: 733, type: !284, scopeLine: 733, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!337 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSERKS1_", scope: !14, file: !2, line: 751, type: !338, scopeLine: 751, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!338 = !DISubroutineType(types: !339)
!339 = !{!340, !286, !306}
!340 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !14, size: 64)
!341 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSEOS1_", scope: !14, file: !2, line: 766, type: !342, scopeLine: 766, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!342 = !DISubroutineType(types: !343)
!343 = !{!340, !286, !311}
!344 = !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSESt16initializer_listIiE", scope: !14, file: !2, line: 788, type: !345, scopeLine: 788, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!345 = !DISubroutineType(types: !346)
!346 = !{!340, !286, !334}
!347 = !DISubprogram(name: "assign", linkageName: "_ZNSt6vectorIiSaIiEE6assignEmRKi", scope: !14, file: !2, line: 808, type: !348, scopeLine: 808, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!348 = !DISubroutineType(types: !349)
!349 = !{null, !286, !296, !300}
!350 = !DISubprogram(name: "assign", linkageName: "_ZNSt6vectorIiSaIiEE6assignESt16initializer_listIiE", scope: !14, file: !2, line: 855, type: !351, scopeLine: 855, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!351 = !DISubroutineType(types: !352)
!352 = !{null, !286, !334}
!353 = !DISubprogram(name: "begin", linkageName: "_ZNSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 873, type: !354, scopeLine: 873, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!354 = !DISubroutineType(types: !355)
!355 = !{!356, !286}
!356 = !DIDerivedType(tag: DW_TAG_typedef, name: "iterator", scope: !14, file: !2, line: 458, baseType: !357, flags: DIFlagPublic)
!357 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__normal_iterator<int *, std::vector<int, std::allocator<int> > >", scope: !29, file: !358, line: 1047, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !359, templateParams: !414, identifier: "_ZTSN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE")
!358 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_iterator.h", directory: "", checksumkind: CSK_MD5, checksum: "078d2c6e40695db2f690aeaa2795d719")
!359 = !{!360, !361, !365, !370, !382, !387, !391, !394, !395, !396, !403, !406, !409, !410, !411}
!360 = !DIDerivedType(tag: DW_TAG_member, name: "_M_current", scope: !357, file: !358, line: 1050, baseType: !39, size: 64, flags: DIFlagProtected)
!361 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC4Ev", scope: !357, file: !358, line: 1072, type: !362, scopeLine: 1072, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!362 = !DISubroutineType(types: !363)
!363 = !{null, !364}
!364 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !357, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!365 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC4ERKS1_", scope: !357, file: !358, line: 1076, type: !366, scopeLine: 1076, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: 0)
!366 = !DISubroutineType(types: !367)
!367 = !{null, !364, !368}
!368 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !369, size: 64)
!369 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !39)
!370 = !DISubprogram(name: "operator*", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv", scope: !357, file: !358, line: 1099, type: !371, scopeLine: 1099, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!371 = !DISubroutineType(types: !372)
!372 = !{!373, !380}
!373 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !357, file: !358, line: 1065, baseType: !374, flags: DIFlagPublic)
!374 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !376, file: !375, line: 205, baseType: !379)
!375 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_iterator_base_types.h", directory: "")
!376 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "iterator_traits<int *>", scope: !15, file: !375, line: 198, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !377, identifier: "_ZTSSt15iterator_traitsIPiE")
!377 = !{!378}
!378 = !DITemplateTypeParameter(name: "_Iterator", type: !39)
!379 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !40, size: 64)
!380 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !381, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!381 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !357)
!382 = !DISubprogram(name: "operator->", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEptEv", scope: !357, file: !358, line: 1104, type: !383, scopeLine: 1104, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!383 = !DISubroutineType(types: !384)
!384 = !{!385, !380}
!385 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !357, file: !358, line: 1066, baseType: !386, flags: DIFlagPublic)
!386 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !376, file: !375, line: 204, baseType: !39)
!387 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv", scope: !357, file: !358, line: 1109, type: !388, scopeLine: 1109, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!388 = !DISubroutineType(types: !389)
!389 = !{!390, !364}
!390 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !357, size: 64)
!391 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEi", scope: !357, file: !358, line: 1117, type: !392, scopeLine: 1117, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!392 = !DISubroutineType(types: !393)
!393 = !{!357, !364, !40}
!394 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmmEv", scope: !357, file: !358, line: 1123, type: !388, scopeLine: 1123, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!395 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmmEi", scope: !357, file: !358, line: 1131, type: !392, scopeLine: 1131, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!396 = !DISubprogram(name: "operator[]", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEixEl", scope: !357, file: !358, line: 1137, type: !397, scopeLine: 1137, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!397 = !DISubroutineType(types: !398)
!398 = !{!373, !380, !399}
!399 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !357, file: !358, line: 1064, baseType: !400, flags: DIFlagPublic)
!400 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !376, file: !375, line: 203, baseType: !401)
!401 = !DIDerivedType(tag: DW_TAG_typedef, name: "ptrdiff_t", scope: !15, file: !70, line: 309, baseType: !402)
!402 = !DIBasicType(name: "long", size: 64, encoding: DW_ATE_signed)
!403 = !DISubprogram(name: "operator+=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEpLEl", scope: !357, file: !358, line: 1142, type: !404, scopeLine: 1142, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!404 = !DISubroutineType(types: !405)
!405 = !{!390, !364, !399}
!406 = !DISubprogram(name: "operator+", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEplEl", scope: !357, file: !358, line: 1147, type: !407, scopeLine: 1147, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!407 = !DISubroutineType(types: !408)
!408 = !{!357, !380, !399}
!409 = !DISubprogram(name: "operator-=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmIEl", scope: !357, file: !358, line: 1152, type: !404, scopeLine: 1152, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!410 = !DISubprogram(name: "operator-", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEmiEl", scope: !357, file: !358, line: 1157, type: !407, scopeLine: 1157, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!411 = !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv", scope: !357, file: !358, line: 1162, type: !412, scopeLine: 1162, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!412 = !DISubroutineType(types: !413)
!413 = !{!368, !380}
!414 = !{!378, !415}
!415 = !DITemplateTypeParameter(name: "_Container", type: !14)
!416 = !DISubprogram(name: "begin", linkageName: "_ZNKSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 883, type: !417, scopeLine: 883, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!417 = !DISubroutineType(types: !418)
!418 = !{!419, !476}
!419 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_iterator", scope: !14, file: !2, line: 460, baseType: !420, flags: DIFlagPublic)
!420 = distinct !DICompositeType(tag: DW_TAG_class_type, name: "__normal_iterator<const int *, std::vector<int, std::allocator<int> > >", scope: !29, file: !358, line: 1047, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !421, templateParams: !475, identifier: "_ZTSN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEE")
!421 = !{!422, !425, !429, !434, !445, !450, !454, !457, !458, !459, !464, !467, !470, !471, !472}
!422 = !DIDerivedType(tag: DW_TAG_member, name: "_M_current", scope: !420, file: !358, line: 1050, baseType: !423, size: 64, flags: DIFlagProtected)
!423 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !424, size: 64)
!424 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !40)
!425 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC4Ev", scope: !420, file: !358, line: 1072, type: !426, scopeLine: 1072, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!426 = !DISubroutineType(types: !427)
!427 = !{null, !428}
!428 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !420, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!429 = !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC4ERKS2_", scope: !420, file: !358, line: 1076, type: !430, scopeLine: 1076, flags: DIFlagPublic | DIFlagExplicit | DIFlagPrototyped, spFlags: 0)
!430 = !DISubroutineType(types: !431)
!431 = !{null, !428, !432}
!432 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !433, size: 64)
!433 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !423)
!434 = !DISubprogram(name: "operator*", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEdeEv", scope: !420, file: !358, line: 1099, type: !435, scopeLine: 1099, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!435 = !DISubroutineType(types: !436)
!436 = !{!437, !443}
!437 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !420, file: !358, line: 1065, baseType: !438, flags: DIFlagPublic)
!438 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !439, file: !375, line: 205, baseType: !442)
!439 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "iterator_traits<const int *>", scope: !15, file: !375, line: 198, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !440, identifier: "_ZTSSt15iterator_traitsIPKiE")
!440 = !{!441}
!441 = !DITemplateTypeParameter(name: "_Iterator", type: !423)
!442 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !424, size: 64)
!443 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !444, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!444 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !420)
!445 = !DISubprogram(name: "operator->", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEptEv", scope: !420, file: !358, line: 1104, type: !446, scopeLine: 1104, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!446 = !DISubroutineType(types: !447)
!447 = !{!448, !443}
!448 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !420, file: !358, line: 1066, baseType: !449, flags: DIFlagPublic)
!449 = !DIDerivedType(tag: DW_TAG_typedef, name: "pointer", scope: !439, file: !375, line: 204, baseType: !423)
!450 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEppEv", scope: !420, file: !358, line: 1109, type: !451, scopeLine: 1109, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!451 = !DISubroutineType(types: !452)
!452 = !{!453, !428}
!453 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !420, size: 64)
!454 = !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEppEi", scope: !420, file: !358, line: 1117, type: !455, scopeLine: 1117, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!455 = !DISubroutineType(types: !456)
!456 = !{!420, !428, !40}
!457 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmmEv", scope: !420, file: !358, line: 1123, type: !451, scopeLine: 1123, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!458 = !DISubprogram(name: "operator--", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmmEi", scope: !420, file: !358, line: 1131, type: !455, scopeLine: 1131, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!459 = !DISubprogram(name: "operator[]", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEixEl", scope: !420, file: !358, line: 1137, type: !460, scopeLine: 1137, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!460 = !DISubroutineType(types: !461)
!461 = !{!437, !443, !462}
!462 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !420, file: !358, line: 1064, baseType: !463, flags: DIFlagPublic)
!463 = !DIDerivedType(tag: DW_TAG_typedef, name: "difference_type", scope: !439, file: !375, line: 203, baseType: !401)
!464 = !DISubprogram(name: "operator+=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEpLEl", scope: !420, file: !358, line: 1142, type: !465, scopeLine: 1142, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!465 = !DISubroutineType(types: !466)
!466 = !{!453, !428, !462}
!467 = !DISubprogram(name: "operator+", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEplEl", scope: !420, file: !358, line: 1147, type: !468, scopeLine: 1147, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!468 = !DISubroutineType(types: !469)
!469 = !{!420, !443, !462}
!470 = !DISubprogram(name: "operator-=", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmIEl", scope: !420, file: !358, line: 1152, type: !465, scopeLine: 1152, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!471 = !DISubprogram(name: "operator-", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEmiEl", scope: !420, file: !358, line: 1157, type: !468, scopeLine: 1157, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!472 = !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv", scope: !420, file: !358, line: 1162, type: !473, scopeLine: 1162, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!473 = !DISubroutineType(types: !474)
!474 = !{!432, !443}
!475 = !{!441, !415}
!476 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !307, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!477 = !DISubprogram(name: "end", linkageName: "_ZNSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 893, type: !354, scopeLine: 893, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!478 = !DISubprogram(name: "end", linkageName: "_ZNKSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 903, type: !417, scopeLine: 903, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!479 = !DISubprogram(name: "rbegin", linkageName: "_ZNSt6vectorIiSaIiEE6rbeginEv", scope: !14, file: !2, line: 913, type: !480, scopeLine: 913, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!480 = !DISubroutineType(types: !481)
!481 = !{!482, !286}
!482 = !DIDerivedType(tag: DW_TAG_typedef, name: "reverse_iterator", scope: !14, file: !2, line: 462, baseType: !483, flags: DIFlagPublic)
!483 = !DICompositeType(tag: DW_TAG_class_type, name: "reverse_iterator<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > > >", scope: !15, file: !358, line: 136, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16reverse_iteratorIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEE")
!484 = !DISubprogram(name: "rbegin", linkageName: "_ZNKSt6vectorIiSaIiEE6rbeginEv", scope: !14, file: !2, line: 923, type: !485, scopeLine: 923, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!485 = !DISubroutineType(types: !486)
!486 = !{!487, !476}
!487 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reverse_iterator", scope: !14, file: !2, line: 461, baseType: !488, flags: DIFlagPublic)
!488 = !DICompositeType(tag: DW_TAG_class_type, name: "reverse_iterator<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > > >", scope: !15, file: !358, line: 136, flags: DIFlagFwdDecl | DIFlagNonTrivial, identifier: "_ZTSSt16reverse_iteratorIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEE")
!489 = !DISubprogram(name: "rend", linkageName: "_ZNSt6vectorIiSaIiEE4rendEv", scope: !14, file: !2, line: 933, type: !480, scopeLine: 933, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!490 = !DISubprogram(name: "rend", linkageName: "_ZNKSt6vectorIiSaIiEE4rendEv", scope: !14, file: !2, line: 943, type: !485, scopeLine: 943, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!491 = !DISubprogram(name: "cbegin", linkageName: "_ZNKSt6vectorIiSaIiEE6cbeginEv", scope: !14, file: !2, line: 954, type: !417, scopeLine: 954, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!492 = !DISubprogram(name: "cend", linkageName: "_ZNKSt6vectorIiSaIiEE4cendEv", scope: !14, file: !2, line: 964, type: !417, scopeLine: 964, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!493 = !DISubprogram(name: "crbegin", linkageName: "_ZNKSt6vectorIiSaIiEE7crbeginEv", scope: !14, file: !2, line: 974, type: !485, scopeLine: 974, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!494 = !DISubprogram(name: "crend", linkageName: "_ZNKSt6vectorIiSaIiEE5crendEv", scope: !14, file: !2, line: 984, type: !485, scopeLine: 984, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!495 = !DISubprogram(name: "size", linkageName: "_ZNKSt6vectorIiSaIiEE4sizeEv", scope: !14, file: !2, line: 992, type: !496, scopeLine: 992, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!496 = !DISubroutineType(types: !497)
!497 = !{!296, !476}
!498 = !DISubprogram(name: "max_size", linkageName: "_ZNKSt6vectorIiSaIiEE8max_sizeEv", scope: !14, file: !2, line: 998, type: !496, scopeLine: 998, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!499 = !DISubprogram(name: "resize", linkageName: "_ZNSt6vectorIiSaIiEE6resizeEm", scope: !14, file: !2, line: 1013, type: !500, scopeLine: 1013, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!500 = !DISubroutineType(types: !501)
!501 = !{null, !286, !296}
!502 = !DISubprogram(name: "resize", linkageName: "_ZNSt6vectorIiSaIiEE6resizeEmRKi", scope: !14, file: !2, line: 1034, type: !348, scopeLine: 1034, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!503 = !DISubprogram(name: "shrink_to_fit", linkageName: "_ZNSt6vectorIiSaIiEE13shrink_to_fitEv", scope: !14, file: !2, line: 1068, type: !284, scopeLine: 1068, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!504 = !DISubprogram(name: "capacity", linkageName: "_ZNKSt6vectorIiSaIiEE8capacityEv", scope: !14, file: !2, line: 1078, type: !496, scopeLine: 1078, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!505 = !DISubprogram(name: "empty", linkageName: "_ZNKSt6vectorIiSaIiEE5emptyEv", scope: !14, file: !2, line: 1088, type: !506, scopeLine: 1088, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!506 = !DISubroutineType(types: !507)
!507 = !{!131, !476}
!508 = !DISubprogram(name: "reserve", linkageName: "_ZNSt6vectorIiSaIiEE7reserveEm", scope: !14, file: !2, line: 1110, type: !500, scopeLine: 1110, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!509 = !DISubprogram(name: "operator[]", linkageName: "_ZNSt6vectorIiSaIiEEixEm", scope: !14, file: !2, line: 1126, type: !510, scopeLine: 1126, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!510 = !DISubroutineType(types: !511)
!511 = !{!512, !286, !296}
!512 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !14, file: !2, line: 456, baseType: !513, flags: DIFlagPublic)
!513 = !DIDerivedType(tag: DW_TAG_typedef, name: "reference", scope: !28, file: !26, line: 59, baseType: !514)
!514 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !515, size: 64)
!515 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !28, file: !26, line: 53, baseType: !516)
!516 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !32, file: !33, line: 434, baseType: !40)
!517 = !DISubprogram(name: "operator[]", linkageName: "_ZNKSt6vectorIiSaIiEEixEm", scope: !14, file: !2, line: 1145, type: !518, scopeLine: 1145, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!518 = !DISubroutineType(types: !519)
!519 = !{!520, !476, !296}
!520 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reference", scope: !14, file: !2, line: 457, baseType: !521, flags: DIFlagPublic)
!521 = !DIDerivedType(tag: DW_TAG_typedef, name: "const_reference", scope: !28, file: !26, line: 60, baseType: !522)
!522 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !523, size: 64)
!523 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !515)
!524 = !DISubprogram(name: "_M_range_check", linkageName: "_ZNKSt6vectorIiSaIiEE14_M_range_checkEm", scope: !14, file: !2, line: 1155, type: !525, scopeLine: 1155, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!525 = !DISubroutineType(types: !526)
!526 = !{null, !476, !296}
!527 = !DISubprogram(name: "at", linkageName: "_ZNSt6vectorIiSaIiEE2atEm", scope: !14, file: !2, line: 1178, type: !510, scopeLine: 1178, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!528 = !DISubprogram(name: "at", linkageName: "_ZNKSt6vectorIiSaIiEE2atEm", scope: !14, file: !2, line: 1197, type: !518, scopeLine: 1197, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!529 = !DISubprogram(name: "front", linkageName: "_ZNSt6vectorIiSaIiEE5frontEv", scope: !14, file: !2, line: 1209, type: !530, scopeLine: 1209, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!530 = !DISubroutineType(types: !531)
!531 = !{!512, !286}
!532 = !DISubprogram(name: "front", linkageName: "_ZNKSt6vectorIiSaIiEE5frontEv", scope: !14, file: !2, line: 1221, type: !533, scopeLine: 1221, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!533 = !DISubroutineType(types: !534)
!534 = !{!520, !476}
!535 = !DISubprogram(name: "back", linkageName: "_ZNSt6vectorIiSaIiEE4backEv", scope: !14, file: !2, line: 1233, type: !530, scopeLine: 1233, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!536 = !DISubprogram(name: "back", linkageName: "_ZNKSt6vectorIiSaIiEE4backEv", scope: !14, file: !2, line: 1245, type: !533, scopeLine: 1245, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!537 = !DISubprogram(name: "data", linkageName: "_ZNSt6vectorIiSaIiEE4dataEv", scope: !14, file: !2, line: 1260, type: !538, scopeLine: 1260, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!538 = !DISubroutineType(types: !539)
!539 = !{!39, !286}
!540 = !DISubprogram(name: "data", linkageName: "_ZNKSt6vectorIiSaIiEE4dataEv", scope: !14, file: !2, line: 1265, type: !541, scopeLine: 1265, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!541 = !DISubroutineType(types: !542)
!542 = !{!423, !476}
!543 = !DISubprogram(name: "push_back", linkageName: "_ZNSt6vectorIiSaIiEE9push_backERKi", scope: !14, file: !2, line: 1281, type: !544, scopeLine: 1281, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!544 = !DISubroutineType(types: !545)
!545 = !{null, !286, !300}
!546 = !DISubprogram(name: "push_back", linkageName: "_ZNSt6vectorIiSaIiEE9push_backEOi", scope: !14, file: !2, line: 1298, type: !547, scopeLine: 1298, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!547 = !DISubroutineType(types: !548)
!548 = !{null, !286, !549}
!549 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !302, size: 64)
!550 = !DISubprogram(name: "pop_back", linkageName: "_ZNSt6vectorIiSaIiEE8pop_backEv", scope: !14, file: !2, line: 1322, type: !284, scopeLine: 1322, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!551 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EERS4_", scope: !14, file: !2, line: 1362, type: !552, scopeLine: 1362, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!552 = !DISubroutineType(types: !553)
!553 = !{!356, !286, !419, !300}
!554 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1393, type: !555, scopeLine: 1393, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!555 = !DISubroutineType(types: !556)
!556 = !{!356, !286, !419, !549}
!557 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EESt16initializer_listIiE", scope: !14, file: !2, line: 1411, type: !558, scopeLine: 1411, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!558 = !DISubroutineType(types: !559)
!559 = !{!356, !286, !419, !334}
!560 = !DISubprogram(name: "insert", linkageName: "_ZNSt6vectorIiSaIiEE6insertEN9__gnu_cxx17__normal_iteratorIPKiS1_EEmRS4_", scope: !14, file: !2, line: 1437, type: !561, scopeLine: 1437, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!561 = !DISubroutineType(types: !562)
!562 = !{!356, !286, !419, !296, !300}
!563 = !DISubprogram(name: "erase", linkageName: "_ZNSt6vectorIiSaIiEE5eraseEN9__gnu_cxx17__normal_iteratorIPKiS1_EE", scope: !14, file: !2, line: 1534, type: !564, scopeLine: 1534, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!564 = !DISubroutineType(types: !565)
!565 = !{!356, !286, !419}
!566 = !DISubprogram(name: "erase", linkageName: "_ZNSt6vectorIiSaIiEE5eraseEN9__gnu_cxx17__normal_iteratorIPKiS1_EES6_", scope: !14, file: !2, line: 1562, type: !567, scopeLine: 1562, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!567 = !DISubroutineType(types: !568)
!568 = !{!356, !286, !419, !419}
!569 = !DISubprogram(name: "swap", linkageName: "_ZNSt6vectorIiSaIiEE4swapERS1_", scope: !14, file: !2, line: 1586, type: !570, scopeLine: 1586, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!570 = !DISubroutineType(types: !571)
!571 = !{null, !286, !340}
!572 = !DISubprogram(name: "clear", linkageName: "_ZNSt6vectorIiSaIiEE5clearEv", scope: !14, file: !2, line: 1605, type: !284, scopeLine: 1605, flags: DIFlagPublic | DIFlagPrototyped, spFlags: 0)
!573 = !DISubprogram(name: "_M_fill_initialize", linkageName: "_ZNSt6vectorIiSaIiEE18_M_fill_initializeEmRKi", scope: !14, file: !2, line: 1704, type: !348, scopeLine: 1704, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!574 = !DISubprogram(name: "_M_default_initialize", linkageName: "_ZNSt6vectorIiSaIiEE21_M_default_initializeEm", scope: !14, file: !2, line: 1715, type: !500, scopeLine: 1715, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!575 = !DISubprogram(name: "_M_fill_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_fill_assignEmRKi", scope: !14, file: !2, line: 1762, type: !348, scopeLine: 1762, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!576 = !DISubprogram(name: "_M_fill_insert", linkageName: "_ZNSt6vectorIiSaIiEE14_M_fill_insertEN9__gnu_cxx17__normal_iteratorIPiS1_EEmRKi", scope: !14, file: !2, line: 1806, type: !577, scopeLine: 1806, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!577 = !DISubroutineType(types: !578)
!578 = !{null, !286, !356, !296, !300}
!579 = !DISubprogram(name: "_M_default_append", linkageName: "_ZNSt6vectorIiSaIiEE17_M_default_appendEm", scope: !14, file: !2, line: 1812, type: !500, scopeLine: 1812, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!580 = !DISubprogram(name: "_M_shrink_to_fit", linkageName: "_ZNSt6vectorIiSaIiEE16_M_shrink_to_fitEv", scope: !14, file: !2, line: 1816, type: !581, scopeLine: 1816, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!581 = !DISubroutineType(types: !582)
!582 = !{!131, !286}
!583 = !DISubprogram(name: "_M_insert_rval", linkageName: "_ZNSt6vectorIiSaIiEE14_M_insert_rvalEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1878, type: !555, scopeLine: 1878, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!584 = !DISubprogram(name: "_M_emplace_aux", linkageName: "_ZNSt6vectorIiSaIiEE14_M_emplace_auxEN9__gnu_cxx17__normal_iteratorIPKiS1_EEOi", scope: !14, file: !2, line: 1889, type: !555, scopeLine: 1889, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!585 = !DISubprogram(name: "_M_check_len", linkageName: "_ZNKSt6vectorIiSaIiEE12_M_check_lenEmPKc", scope: !14, file: !2, line: 1896, type: !586, scopeLine: 1896, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!586 = !DISubroutineType(types: !587)
!587 = !{!296, !476, !296, !588}
!588 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !4, size: 64)
!589 = !DISubprogram(name: "_S_check_init_len", linkageName: "_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_", scope: !14, file: !2, line: 1907, type: !590, scopeLine: 1907, flags: DIFlagProtected | DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!590 = !DISubroutineType(types: !591)
!591 = !{!296, !296, !290}
!592 = !DISubprogram(name: "_S_max_size", linkageName: "_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_", scope: !14, file: !2, line: 1916, type: !593, scopeLine: 1916, flags: DIFlagProtected | DIFlagPrototyped | DIFlagStaticMember, spFlags: 0)
!593 = !DISubroutineType(types: !594)
!594 = !{!296, !595}
!595 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !596, size: 64)
!596 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !276)
!597 = !DISubprogram(name: "_M_erase_at_end", linkageName: "_ZNSt6vectorIiSaIiEE15_M_erase_at_endEPi", scope: !14, file: !2, line: 1933, type: !598, scopeLine: 1933, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!598 = !DISubroutineType(types: !599)
!599 = !{null, !286, !274}
!600 = !DISubprogram(name: "_M_erase", linkageName: "_ZNSt6vectorIiSaIiEE8_M_eraseEN9__gnu_cxx17__normal_iteratorIPiS1_EE", scope: !14, file: !2, line: 1946, type: !601, scopeLine: 1946, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!601 = !DISubroutineType(types: !602)
!602 = !{!356, !286, !356}
!603 = !DISubprogram(name: "_M_erase", linkageName: "_ZNSt6vectorIiSaIiEE8_M_eraseEN9__gnu_cxx17__normal_iteratorIPiS1_EES5_", scope: !14, file: !2, line: 1950, type: !604, scopeLine: 1950, flags: DIFlagProtected | DIFlagPrototyped, spFlags: 0)
!604 = !DISubroutineType(types: !605)
!605 = !{!356, !286, !356, !356}
!606 = !DISubprogram(name: "_M_move_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 1959, type: !607, scopeLine: 1959, flags: DIFlagPrototyped, spFlags: 0)
!607 = !DISubroutineType(types: !608)
!608 = !{null, !286, !311, !238}
!609 = !DISubprogram(name: "_M_move_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb0EE", scope: !14, file: !2, line: 1971, type: !610, scopeLine: 1971, flags: DIFlagPrototyped, spFlags: 0)
!610 = !DISubroutineType(types: !611)
!611 = !{null, !286, !311, !257}
!612 = !{!82, !613}
!613 = !DITemplateTypeParameter(name: "_Alloc", type: !43, defaulted: true)
!614 = !DIDerivedType(tag: DW_TAG_member, name: "bucket", scope: !11, file: !9, line: 14, baseType: !615, size: 64, offset: 192)
!615 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Bucket", file: !9, line: 7, size: 64, flags: DIFlagTypePassByValue | DIFlagNonTrivial, elements: !616, identifier: "_ZTS6Bucket")
!616 = !{!617, !618}
!617 = !DIDerivedType(tag: DW_TAG_member, name: "hits", scope: !615, file: !9, line: 8, baseType: !40, size: 32)
!618 = !DIDerivedType(tag: DW_TAG_member, name: "misses", scope: !615, file: !9, line: 9, baseType: !40, size: 32, offset: 32)
!619 = !DIDerivedType(tag: DW_TAG_member, name: "handle", scope: !11, file: !9, line: 15, baseType: !39, size: 64, offset: 256)
!620 = !DIDerivedType(tag: DW_TAG_typedef, name: "size_t", file: !621, line: 18, baseType: !71)
!621 = !DIFile(filename: "/usr/lib/llvm-23/lib/clang/23/include/__stddef_size_t.h", directory: "", checksumkind: CSK_MD5, checksum: "2c44e821a2b1951cde2eb0fb2e656867")
!622 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: null, size: 64)
!623 = !{!0}
!624 = !{!625, !629}
!625 = !DIImportedEntity(tag: DW_TAG_imported_module, scope: !626, entity: !627, file: !628, line: 58)
!626 = !DINamespace(name: "__gnu_debug", scope: null)
!627 = !DINamespace(name: "__debug", scope: !15)
!628 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/debug/debug.h", directory: "", checksumkind: CSK_MD5, checksum: "752210a319f5f5d356cc29cd1ce3cdc7")
!629 = !DIImportedEntity(tag: DW_TAG_imported_declaration, scope: !15, entity: !630, file: !638, line: 58)
!630 = !DIDerivedType(tag: DW_TAG_typedef, name: "max_align_t", file: !631, line: 24, baseType: !632)
!631 = !DIFile(filename: "/usr/lib/llvm-23/lib/clang/23/include/__stddef_max_align_t.h", directory: "", checksumkind: CSK_MD5, checksum: "3c0a2f19d136d39aa835c737c7105def")
!632 = distinct !DICompositeType(tag: DW_TAG_structure_type, file: !631, line: 19, size: 256, flags: DIFlagTypePassByValue, elements: !633, identifier: "_ZTS11max_align_t")
!633 = !{!634, !636}
!634 = !DIDerivedType(tag: DW_TAG_member, name: "__clang_max_align_nonce1", scope: !632, file: !631, line: 20, baseType: !635, size: 64, align: 64)
!635 = !DIBasicType(name: "long long", size: 64, encoding: DW_ATE_signed)
!636 = !DIDerivedType(tag: DW_TAG_member, name: "__clang_max_align_nonce2", scope: !632, file: !631, line: 22, baseType: !637, size: 128, align: 128, offset: 128)
!637 = !DIBasicType(name: "long double", size: 128, encoding: DW_ATE_float)
!638 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/cstddef", directory: "")
!639 = !{i32 7, !"Dwarf Version", i32 5}
!640 = !{i32 2, !"Debug Info Version", i32 3}
!641 = !{i32 8, !"PIC Level", i32 2}
!642 = !{i32 7, !"PIE Level", i32 2}
!643 = !{i32 7, !"uwtable", i32 2}
!644 = !{i32 7, !"frame-pointer", i32 2}
!645 = !{!"Ubuntu clang version 23.1.4 (++20261018124056+71c76755a8ff-1~exp1~20261018124211.83)"}
!646 = distinct !DISubprogram(name: "carry", linkageName: "_Z5carry3Box", scope: !9, file: !9, line: 23, type: !647, scopeLine: 23, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, retainedNodes: !138)
!647 = !DISubroutineType(types: !648)
!648 = !{!11, !11}
!649 = !DILocalVariable(name: "box", arg: 1, scope: !646, file: !9, line: 23, type: !11)
!650 = !DILocation(line: 23, column: 41, scope: !646)
!651 = !DILocation(line: 24, column: 7, scope: !646)
!652 = !DILocation(line: 24, column: 14, scope: !646)
!653 = !DILocation(line: 24, column: 19, scope: !646)
!654 = !DILocation(line: 25, column: 10, scope: !646)
!655 = !DILocation(line: 25, column: 3, scope: !646)
!656 = distinct !DISubprogram(name: "Box", linkageName: "_ZN3BoxC2EOS_", scope: !11, file: !9, line: 12, type: !657, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !661, retainedNodes: !138)
!657 = !DISubroutineType(types: !658)
!658 = !{null, !659, !660}
!659 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !11, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!660 = !DIDerivedType(tag: DW_TAG_rvalue_reference_type, baseType: !11, size: 64)
!661 = !DISubprogram(name: "Box", linkageName: "_ZN3BoxC4EOS_", scope: !11, type: !657, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: 0)
!662 = !DILocalVariable(name: "this", arg: 1, scope: !656, type: !663, flags: DIFlagArtificial | DIFlagObjectPointer)
!663 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !11, size: 64)
!664 = !DILocation(line: 0, scope: !656)
!665 = !DILocalVariable(arg: 2, scope: !656, type: !660, flags: DIFlagArtificial)
!666 = !DILocation(line: 12, column: 8, scope: !656)
!667 = !{i64 8}
!668 = distinct !DISubprogram(name: "advance", linkageName: "_Z7advance3Envi", scope: !9, file: !9, line: 28, type: !669, scopeLine: 28, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, retainedNodes: !675)
!669 = !DISubroutineType(types: !670)
!670 = !{!40, !671, !40}
!671 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "Env", file: !9, line: 18, size: 384, flags: DIFlagTypePassByReference | DIFlagNonTrivial, elements: !672, identifier: "_ZTS3Env")
!672 = !{!673, !674}
!673 = !DIDerivedType(tag: DW_TAG_member, name: "epoch", scope: !671, file: !9, line: 19, baseType: !40, size: 32)
!674 = !DIDerivedType(tag: DW_TAG_member, name: "box", scope: !671, file: !9, line: 20, baseType: !11, size: 320, offset: 64)
!675 = !{!676}
!676 = distinct !DICompositeType(tag: DW_TAG_class_type, scope: !668, file: !9, line: 34, size: 8, flags: DIFlagTypePassByValue, elements: !138)
!677 = !DILocalVariable(name: "env", arg: 1, scope: !668, file: !9, line: 28, type: !671)
!678 = !DILocation(line: 28, column: 17, scope: !668)
!679 = !DILocalVariable(name: "n", arg: 2, scope: !668, file: !9, line: 28, type: !40)
!680 = !DILocation(line: 28, column: 26, scope: !668)
!681 = !DILocalVariable(name: "box", scope: !668, file: !9, line: 29, type: !11)
!682 = !DILocation(line: 29, column: 8, scope: !668)
!683 = !DILocation(line: 29, column: 17, scope: !668)
!684 = !DILocation(line: 29, column: 32, scope: !668)
!685 = !DILocation(line: 29, column: 36, scope: !668)
!686 = !DILocation(line: 29, column: 18, scope: !668)
!687 = !DILocation(line: 29, column: 60, scope: !668)
!688 = !DILocation(line: 29, column: 64, scope: !668)
!689 = !DILocation(line: 29, column: 46, scope: !668)
!690 = !DILocalVariable(name: "layers", scope: !668, file: !9, line: 30, type: !14)
!691 = !DILocation(line: 30, column: 20, scope: !668)
!692 = !DILocation(line: 30, column: 47, scope: !668)
!693 = !DILocalVariable(name: "this", arg: 1, scope: !694, type: !695, flags: DIFlagArtificial | DIFlagObjectPointer)
!694 = distinct !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC2Ev", scope: !43, file: !44, line: 163, type: !84, scopeLine: 163, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !83, retainedNodes: !138)
!695 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !43, size: 64)
!696 = !DILocation(line: 0, scope: !694, inlinedAt: !697)
!697 = distinct !DILocation(line: 30, column: 20, scope: !668)
!698 = !DILocalVariable(name: "this", arg: 1, scope: !699, type: !700, flags: DIFlagArtificial | DIFlagObjectPointer)
!699 = distinct !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC2Ev", scope: !49, file: !50, line: 88, type: !53, scopeLine: 88, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !52, retainedNodes: !138)
!700 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !49, size: 64)
!701 = !DILocation(line: 0, scope: !699, inlinedAt: !702)
!702 = distinct !DILocation(line: 163, column: 7, scope: !694, inlinedAt: !697)
!703 = !DILocalVariable(name: "this", arg: 1, scope: !704, type: !695, flags: DIFlagArtificial | DIFlagObjectPointer)
!704 = distinct !DISubprogram(name: "~allocator", linkageName: "_ZNSaIiED2Ev", scope: !43, file: !44, line: 184, type: !84, scopeLine: 184, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !96, retainedNodes: !138)
!705 = !DILocation(line: 0, scope: !704, inlinedAt: !706)
!706 = distinct !DILocation(line: 30, column: 20, scope: !668)
!707 = !DILocation(line: 31, column: 20, scope: !668)
!708 = !DILocation(line: 31, column: 36, scope: !668)
!709 = !DILocation(line: 31, column: 3, scope: !668)
!710 = !DILocalVariable(name: "result", scope: !668, file: !9, line: 32, type: !11)
!711 = !DILocation(line: 32, column: 8, scope: !668)
!712 = !DILocation(line: 33, column: 14, scope: !668)
!713 = !DILocation(line: 33, column: 30, scope: !668)
!714 = !DILocation(line: 33, column: 37, scope: !668)
!715 = !DILocation(line: 32, column: 17, scope: !668)
!716 = !DILocalVariable(name: "next", scope: !668, file: !9, line: 42, type: !11)
!717 = !DILocation(line: 42, column: 8, scope: !668)
!718 = !DILocation(line: 42, column: 21, scope: !668)
!719 = !DILocation(line: 42, column: 15, scope: !668)
!720 = !DILocation(line: 44, column: 17, scope: !668)
!721 = !DILocation(line: 44, column: 24, scope: !668)
!722 = !DILocation(line: 45, column: 1, scope: !668)
!723 = !DILocation(line: 0, scope: !704, inlinedAt: !724)
!724 = distinct !DILocation(line: 30, column: 20, scope: !668)
!725 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2EOS1_", scope: !14, file: !2, line: 620, type: !309, scopeLine: 620, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !308, retainedNodes: !138)
!726 = !DILocalVariable(name: "this", arg: 1, scope: !725, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!727 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !14, size: 64)
!728 = !DILocation(line: 0, scope: !725)
!729 = !DILocalVariable(arg: 2, scope: !725, file: !2, line: 620, type: !311)
!730 = !DILocation(line: 620, column: 22, scope: !725)
!731 = !DILocation(line: 620, column: 7, scope: !725)
!732 = !DILocation(line: 620, column: 41, scope: !725)
!733 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2EmRKS0_", scope: !14, file: !2, line: 556, type: !294, scopeLine: 558, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !293, retainedNodes: !138)
!734 = !DILocalVariable(name: "this", arg: 1, scope: !733, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!735 = !DILocation(line: 0, scope: !733)
!736 = !DILocalVariable(name: "__n", arg: 2, scope: !733, file: !2, line: 556, type: !296)
!737 = !DILocation(line: 556, column: 24, scope: !733)
!738 = !DILocalVariable(name: "__a", arg: 3, scope: !733, file: !2, line: 556, type: !290)
!739 = !DILocation(line: 556, column: 51, scope: !733)
!740 = !DILocation(line: 557, column: 33, scope: !733)
!741 = !DILocation(line: 557, column: 38, scope: !733)
!742 = !DILocation(line: 557, column: 15, scope: !733)
!743 = !DILocation(line: 557, column: 44, scope: !733)
!744 = !DILocation(line: 557, column: 9, scope: !733)
!745 = !DILocation(line: 558, column: 31, scope: !746)
!746 = distinct !DILexicalBlock(scope: !733, file: !2, line: 558, column: 7)
!747 = !DILocation(line: 558, column: 9, scope: !746)
!748 = !DILocation(line: 558, column: 37, scope: !733)
!749 = !DILocation(line: 558, column: 37, scope: !746)
!750 = distinct !DISubprogram(name: "iota<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > >, int>", linkageName: "_ZSt4iotaIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEEiEvT_S7_T0_", scope: !15, file: !751, line: 88, type: !752, scopeLine: 89, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !754, retainedNodes: !138)
!751 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_numeric.h", directory: "", checksumkind: CSK_MD5, checksum: "a160d3a1010219c7f0a400e068b1b39c")
!752 = !DISubroutineType(types: !753)
!753 = !{null, !357, !357, !40}
!754 = !{!755, !82}
!755 = !DITemplateTypeParameter(name: "_ForwardIterator", type: !357)
!756 = !DILocalVariable(name: "__first", arg: 1, scope: !750, file: !751, line: 88, type: !357)
!757 = !DILocation(line: 88, column: 27, scope: !750)
!758 = !DILocalVariable(name: "__last", arg: 2, scope: !750, file: !751, line: 88, type: !357)
!759 = !DILocation(line: 88, column: 53, scope: !750)
!760 = !DILocalVariable(name: "__value", arg: 3, scope: !750, file: !751, line: 88, type: !40)
!761 = !DILocation(line: 88, column: 65, scope: !750)
!762 = !DILocation(line: 97, column: 7, scope: !750)
!763 = !DILocation(line: 97, column: 22, scope: !764)
!764 = distinct !DILexicalBlock(scope: !765, file: !751, line: 97, column: 7)
!765 = distinct !DILexicalBlock(scope: !750, file: !751, line: 97, column: 7)
!766 = !DILocation(line: 97, column: 7, scope: !765)
!767 = !DILocation(line: 99, column: 15, scope: !768)
!768 = distinct !DILexicalBlock(scope: !764, file: !751, line: 98, column: 2)
!769 = !DILocation(line: 99, column: 4, scope: !768)
!770 = !DILocation(line: 99, column: 13, scope: !768)
!771 = !DILocation(line: 100, column: 4, scope: !768)
!772 = !DILocation(line: 101, column: 2, scope: !768)
!773 = !DILocation(line: 97, column: 33, scope: !764)
!774 = !DILocation(line: 97, column: 7, scope: !764)
!775 = distinct !{!775, !766, !776, !777}
!776 = !DILocation(line: 101, column: 2, scope: !765)
!777 = !{!"llvm.loop.mustprogress"}
!778 = !DILocation(line: 102, column: 5, scope: !750)
!779 = distinct !DISubprogram(name: "begin", linkageName: "_ZNSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 873, type: !354, scopeLine: 874, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !353, retainedNodes: !138)
!780 = !DILocalVariable(name: "this", arg: 1, scope: !779, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!781 = !DILocation(line: 0, scope: !779)
!782 = !DILocation(line: 874, column: 31, scope: !779)
!783 = !DILocation(line: 874, column: 39, scope: !779)
!784 = !DILocation(line: 874, column: 16, scope: !779)
!785 = !DILocation(line: 874, column: 9, scope: !779)
!786 = distinct !DISubprogram(name: "end", linkageName: "_ZNSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 893, type: !354, scopeLine: 894, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !477, retainedNodes: !138)
!787 = !DILocalVariable(name: "this", arg: 1, scope: !786, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!788 = !DILocation(line: 0, scope: !786)
!789 = !DILocation(line: 894, column: 31, scope: !786)
!790 = !DILocation(line: 894, column: 39, scope: !786)
!791 = !DILocation(line: 894, column: 16, scope: !786)
!792 = !DILocation(line: 894, column: 9, scope: !786)
!793 = distinct !DISubprogram(name: "accumulate<__gnu_cxx::__normal_iterator<int *, std::vector<int, std::allocator<int> > >, Box, (lambda at prototype/fixtures/fold_recurrence.cpp:34:7)>", linkageName: "_ZSt10accumulateIN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEE3BoxZ7advance3EnviE3$_0ET0_T_SB_SA_T1_", scope: !15, file: !751, line: 161, type: !794, scopeLine: 163, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition, unit: !8, templateParams: !796, retainedNodes: !138)
!794 = !DISubroutineType(types: !795)
!795 = !{!11, !357, !357, !11, !676}
!796 = !{!797, !798, !799}
!797 = !DITemplateTypeParameter(name: "_InputIterator", type: !357)
!798 = !DITemplateTypeParameter(name: "_Tp", type: !11)
!799 = !DITemplateTypeParameter(name: "_BinaryOperation", type: !676)
!800 = !DILocalVariable(name: "__first", arg: 1, scope: !793, file: !751, line: 161, type: !357)
!801 = !DILocation(line: 161, column: 31, scope: !793)
!802 = !DILocalVariable(name: "__last", arg: 2, scope: !793, file: !751, line: 161, type: !357)
!803 = !DILocation(line: 161, column: 55, scope: !793)
!804 = !DILocalVariable(name: "__init", arg: 3, scope: !793, file: !751, line: 161, type: !11)
!805 = !DILocation(line: 161, column: 67, scope: !793)
!806 = !DILocalVariable(name: "__binary_op", arg: 4, scope: !793, file: !751, line: 162, type: !676)
!807 = !DILocation(line: 162, column: 26, scope: !793)
!808 = !DILocation(line: 168, column: 7, scope: !793)
!809 = !DILocation(line: 168, column: 22, scope: !810)
!810 = distinct !DILexicalBlock(scope: !811, file: !751, line: 168, column: 7)
!811 = distinct !DILexicalBlock(scope: !793, file: !751, line: 168, column: 7)
!812 = !DILocation(line: 168, column: 7, scope: !811)
!813 = !DILocation(line: 169, column: 23, scope: !810)
!814 = !DILocation(line: 169, column: 52, scope: !810)
!815 = !DILocation(line: 169, column: 11, scope: !810)
!816 = !DILocation(line: 169, column: 9, scope: !810)
!817 = !DILocation(line: 169, column: 2, scope: !810)
!818 = !DILocation(line: 168, column: 33, scope: !810)
!819 = !DILocation(line: 168, column: 7, scope: !810)
!820 = distinct !{!820, !812, !821, !777}
!821 = !DILocation(line: 169, column: 60, scope: !811)
!822 = !DILocation(line: 171, column: 5, scope: !810)
!823 = !DILocation(line: 170, column: 14, scope: !793)
!824 = !DILocation(line: 170, column: 7, scope: !793)
!825 = distinct !DISubprogram(name: "Box", linkageName: "_ZN3BoxC2ERKS_", scope: !11, file: !9, line: 12, type: !826, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !830, retainedNodes: !138)
!826 = !DISubroutineType(types: !827)
!827 = !{null, !659, !828}
!828 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !829, size: 64)
!829 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !11)
!830 = !DISubprogram(name: "Box", linkageName: "_ZN3BoxC4ERKS_", scope: !11, type: !826, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: 0)
!831 = !DILocalVariable(name: "this", arg: 1, scope: !825, type: !663, flags: DIFlagArtificial | DIFlagObjectPointer)
!832 = !DILocation(line: 0, scope: !825)
!833 = !DILocalVariable(arg: 2, scope: !825, type: !828, flags: DIFlagArtificial)
!834 = !DILocation(line: 12, column: 8, scope: !825)
!835 = distinct !DISubprogram(name: "~Box", linkageName: "_ZN3BoxD2Ev", scope: !11, file: !9, line: 12, type: !836, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !838, retainedNodes: !138)
!836 = !DISubroutineType(types: !837)
!837 = !{null, !659}
!838 = !DISubprogram(name: "~Box", linkageName: "_ZN3BoxD4Ev", scope: !11, type: !836, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: 0)
!839 = !DILocalVariable(name: "this", arg: 1, scope: !835, type: !663, flags: DIFlagArtificial | DIFlagObjectPointer)
!840 = !DILocation(line: 0, scope: !835)
!841 = !DILocation(line: 12, column: 8, scope: !842)
!842 = distinct !DILexicalBlock(scope: !835, file: !9, line: 12, column: 8)
!843 = !DILocation(line: 12, column: 8, scope: !835)
!844 = distinct !DISubprogram(name: "~vector", linkageName: "_ZNSt6vectorIiSaIiEED2Ev", scope: !14, file: !2, line: 733, type: !284, scopeLine: 734, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !336, retainedNodes: !138)
!845 = !DILocalVariable(name: "this", arg: 1, scope: !844, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!846 = !DILocation(line: 0, scope: !844)
!847 = !DILocation(line: 735, column: 22, scope: !848)
!848 = distinct !DILexicalBlock(scope: !844, file: !2, line: 734, column: 7)
!849 = !DILocation(line: 735, column: 30, scope: !848)
!850 = !DILocation(line: 735, column: 46, scope: !848)
!851 = !DILocation(line: 735, column: 54, scope: !848)
!852 = !DILocation(line: 736, column: 9, scope: !848)
!853 = !DILocalVariable(name: "__first", arg: 1, scope: !854, file: !33, line: 945, type: !39)
!854 = distinct !DISubprogram(name: "_Destroy<int *, int>", linkageName: "_ZSt8_DestroyIPiiEvT_S1_RSaIT0_E", scope: !15, file: !33, line: 945, type: !855, scopeLine: 947, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !857, retainedNodes: !138)
!855 = !DISubroutineType(types: !856)
!856 = !{null, !39, !39, !95}
!857 = !{!858, !82}
!858 = !DITemplateTypeParameter(name: "_ForwardIterator", type: !39)
!859 = !DILocation(line: 945, column: 31, scope: !854, inlinedAt: !860)
!860 = distinct !DILocation(line: 735, column: 2, scope: !848)
!861 = !DILocalVariable(name: "__last", arg: 2, scope: !854, file: !33, line: 945, type: !39)
!862 = !DILocation(line: 945, column: 57, scope: !854, inlinedAt: !860)
!863 = !DILocalVariable(arg: 3, scope: !854, file: !33, line: 946, type: !95)
!864 = !DILocation(line: 946, column: 22, scope: !854, inlinedAt: !860)
!865 = !DILocation(line: 948, column: 21, scope: !854, inlinedAt: !860)
!866 = !DILocation(line: 948, column: 30, scope: !854, inlinedAt: !860)
!867 = !DILocation(line: 948, column: 7, scope: !854, inlinedAt: !860)
!868 = !DILocation(line: 949, column: 5, scope: !854, inlinedAt: !860)
!869 = !DILocation(line: 738, column: 7, scope: !848)
!870 = !DILocation(line: 738, column: 7, scope: !844)
!871 = !DILocation(line: 735, column: 2, scope: !848)
!872 = distinct !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC2EOS1_", scope: !18, file: !2, line: 338, type: !214, scopeLine: 338, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !213, retainedNodes: !138)
!873 = !DILocalVariable(name: "this", arg: 1, scope: !872, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!874 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !18, size: 64)
!875 = !DILocation(line: 0, scope: !872)
!876 = !DILocalVariable(arg: 2, scope: !872, file: !2, line: 338, type: !216)
!877 = !DILocation(line: 338, column: 34, scope: !872)
!878 = !DILocation(line: 338, column: 7, scope: !872)
!879 = !DILocation(line: 338, column: 44, scope: !872)
!880 = distinct !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2EOS2_", scope: !21, file: !2, line: 154, type: !175, scopeLine: 156, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !174, retainedNodes: !138)
!881 = !DILocalVariable(name: "this", arg: 1, scope: !880, type: !882, flags: DIFlagArtificial | DIFlagObjectPointer)
!882 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !21, size: 64)
!883 = !DILocation(line: 0, scope: !880)
!884 = !DILocalVariable(name: "__x", arg: 2, scope: !880, file: !2, line: 154, type: !177)
!885 = !DILocation(line: 154, column: 30, scope: !880)
!886 = !DILocation(line: 155, column: 29, scope: !880)
!887 = !DILocalVariable(name: "this", arg: 1, scope: !888, type: !695, flags: DIFlagArtificial | DIFlagObjectPointer)
!888 = distinct !DISubprogram(name: "allocator", linkageName: "_ZNSaIiEC2ERKS_", scope: !43, file: !44, line: 167, type: !88, scopeLine: 168, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !87, retainedNodes: !138)
!889 = !DILocation(line: 0, scope: !888, inlinedAt: !890)
!890 = distinct !DILocation(line: 155, column: 4, scope: !880)
!891 = !DILocalVariable(name: "__a", arg: 2, scope: !888, file: !44, line: 167, type: !90)
!892 = !DILocation(line: 167, column: 34, scope: !888, inlinedAt: !890)
!893 = !DILocation(line: 168, column: 31, scope: !888, inlinedAt: !890)
!894 = !DILocalVariable(name: "this", arg: 1, scope: !895, type: !700, flags: DIFlagArtificial | DIFlagObjectPointer)
!895 = distinct !DISubprogram(name: "__new_allocator", linkageName: "_ZNSt15__new_allocatorIiEC2ERKS0_", scope: !49, file: !50, line: 92, type: !57, scopeLine: 92, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !56, retainedNodes: !138)
!896 = !DILocation(line: 0, scope: !895, inlinedAt: !897)
!897 = distinct !DILocation(line: 168, column: 9, scope: !888, inlinedAt: !890)
!898 = !DILocalVariable(arg: 2, scope: !895, file: !50, line: 92, type: !59)
!899 = !DILocation(line: 92, column: 45, scope: !895, inlinedAt: !897)
!900 = !DILocation(line: 155, column: 64, scope: !880)
!901 = !DILocation(line: 155, column: 36, scope: !880)
!902 = !DILocation(line: 156, column: 4, scope: !880)
!903 = distinct !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2EOS2_", scope: !141, file: !2, line: 105, type: !153, scopeLine: 108, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !152, retainedNodes: !138)
!904 = !DILocalVariable(name: "this", arg: 1, scope: !903, type: !905, flags: DIFlagArtificial | DIFlagObjectPointer)
!905 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !141, size: 64)
!906 = !DILocation(line: 0, scope: !903)
!907 = !DILocalVariable(name: "__x", arg: 2, scope: !903, file: !2, line: 105, type: !155)
!908 = !DILocation(line: 105, column: 40, scope: !903)
!909 = !DILocation(line: 106, column: 4, scope: !903)
!910 = !DILocation(line: 106, column: 13, scope: !903)
!911 = !DILocation(line: 106, column: 17, scope: !903)
!912 = !DILocation(line: 106, column: 28, scope: !903)
!913 = !DILocation(line: 106, column: 38, scope: !903)
!914 = !DILocation(line: 106, column: 42, scope: !903)
!915 = !DILocation(line: 107, column: 4, scope: !903)
!916 = !DILocation(line: 107, column: 22, scope: !903)
!917 = !DILocation(line: 107, column: 26, scope: !903)
!918 = !DILocation(line: 108, column: 35, scope: !919)
!919 = distinct !DILexicalBlock(scope: !903, file: !2, line: 108, column: 2)
!920 = !DILocation(line: 108, column: 39, scope: !919)
!921 = !DILocation(line: 108, column: 57, scope: !919)
!922 = !DILocation(line: 108, column: 19, scope: !919)
!923 = !DILocation(line: 108, column: 23, scope: !919)
!924 = !DILocation(line: 108, column: 33, scope: !919)
!925 = !DILocation(line: 108, column: 4, scope: !919)
!926 = !DILocation(line: 108, column: 8, scope: !919)
!927 = !DILocation(line: 108, column: 17, scope: !919)
!928 = !DILocation(line: 108, column: 70, scope: !903)
!929 = distinct !DISubprogram(name: "_S_check_init_len", linkageName: "_ZNSt6vectorIiSaIiEE17_S_check_init_lenEmRKS0_", scope: !14, file: !2, line: 1907, type: !590, scopeLine: 1908, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !589, retainedNodes: !138)
!930 = !DILocalVariable(name: "__n", arg: 1, scope: !929, file: !2, line: 1907, type: !296)
!931 = !DILocation(line: 1907, column: 35, scope: !929)
!932 = !DILocalVariable(name: "__a", arg: 2, scope: !929, file: !2, line: 1907, type: !290)
!933 = !DILocation(line: 1907, column: 62, scope: !929)
!934 = !DILocation(line: 1909, column: 6, scope: !935)
!935 = distinct !DILexicalBlock(scope: !929, file: !2, line: 1909, column: 6)
!936 = !DILocation(line: 1909, column: 39, scope: !935)
!937 = !DILocation(line: 0, scope: !888, inlinedAt: !938)
!938 = distinct !DILocation(line: 1909, column: 24, scope: !935)
!939 = !DILocation(line: 167, column: 34, scope: !888, inlinedAt: !938)
!940 = !DILocation(line: 168, column: 31, scope: !888, inlinedAt: !938)
!941 = !DILocation(line: 0, scope: !895, inlinedAt: !942)
!942 = distinct !DILocation(line: 168, column: 9, scope: !888, inlinedAt: !938)
!943 = !DILocation(line: 92, column: 45, scope: !895, inlinedAt: !942)
!944 = !DILocation(line: 1909, column: 12, scope: !935)
!945 = !DILocation(line: 1909, column: 10, scope: !935)
!946 = !DILocation(line: 0, scope: !704, inlinedAt: !947)
!947 = distinct !DILocation(line: 1909, column: 6, scope: !935)
!948 = !DILocation(line: 1910, column: 4, scope: !935)
!949 = !DILocation(line: 1912, column: 9, scope: !929)
!950 = !DILocation(line: 1912, column: 2, scope: !929)
!951 = distinct !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC2EmRKS0_", scope: !18, file: !2, line: 333, type: !211, scopeLine: 335, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !210, retainedNodes: !138)
!952 = !DILocalVariable(name: "this", arg: 1, scope: !951, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!953 = !DILocation(line: 0, scope: !951)
!954 = !DILocalVariable(name: "__n", arg: 2, scope: !951, file: !2, line: 333, type: !69)
!955 = !DILocation(line: 333, column: 27, scope: !951)
!956 = !DILocalVariable(name: "__a", arg: 3, scope: !951, file: !2, line: 333, type: !205)
!957 = !DILocation(line: 333, column: 54, scope: !951)
!958 = !DILocation(line: 334, column: 9, scope: !951)
!959 = !DILocation(line: 334, column: 17, scope: !951)
!960 = !DILocation(line: 335, column: 27, scope: !961)
!961 = distinct !DILexicalBlock(scope: !951, file: !2, line: 335, column: 7)
!962 = !DILocation(line: 335, column: 9, scope: !961)
!963 = !DILocation(line: 335, column: 33, scope: !951)
!964 = !DILocation(line: 335, column: 33, scope: !961)
!965 = distinct !DISubprogram(name: "_M_default_initialize", linkageName: "_ZNSt6vectorIiSaIiEE21_M_default_initializeEm", scope: !14, file: !2, line: 1715, type: !500, scopeLine: 1716, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !574, retainedNodes: !138)
!966 = !DILocalVariable(name: "this", arg: 1, scope: !965, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!967 = !DILocation(line: 0, scope: !965)
!968 = !DILocalVariable(name: "__n", arg: 2, scope: !965, file: !2, line: 1715, type: !296)
!969 = !DILocation(line: 1715, column: 39, scope: !965)
!970 = !DILocation(line: 1718, column: 43, scope: !965)
!971 = !DILocation(line: 1718, column: 51, scope: !965)
!972 = !DILocation(line: 1718, column: 61, scope: !965)
!973 = !DILocation(line: 1719, column: 9, scope: !965)
!974 = !DILocation(line: 1718, column: 4, scope: !965)
!975 = !DILocation(line: 1717, column: 8, scope: !965)
!976 = !DILocation(line: 1717, column: 16, scope: !965)
!977 = !DILocation(line: 1717, column: 26, scope: !965)
!978 = !DILocation(line: 1720, column: 7, scope: !965)
!979 = distinct !DISubprogram(name: "~_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEED2Ev", scope: !18, file: !2, line: 367, type: !200, scopeLine: 368, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !226, retainedNodes: !138)
!980 = !DILocalVariable(name: "this", arg: 1, scope: !979, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!981 = !DILocation(line: 0, scope: !979)
!982 = !DILocation(line: 369, column: 16, scope: !983)
!983 = distinct !DILexicalBlock(scope: !979, file: !2, line: 368, column: 7)
!984 = !DILocation(line: 369, column: 24, scope: !983)
!985 = !DILocation(line: 370, column: 9, scope: !983)
!986 = !DILocation(line: 370, column: 17, scope: !983)
!987 = !DILocation(line: 370, column: 37, scope: !983)
!988 = !DILocation(line: 370, column: 45, scope: !983)
!989 = !DILocation(line: 370, column: 35, scope: !983)
!990 = !DILocation(line: 369, column: 2, scope: !983)
!991 = !DILocation(line: 371, column: 7, scope: !983)
!992 = !DILocation(line: 371, column: 7, scope: !979)
!993 = distinct !DISubprogram(name: "_S_max_size", linkageName: "_ZNSt6vectorIiSaIiEE11_S_max_sizeERKS0_", scope: !14, file: !2, line: 1916, type: !593, scopeLine: 1917, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !592, retainedNodes: !138)
!994 = !DILocalVariable(name: "__a", arg: 1, scope: !993, file: !2, line: 1916, type: !595)
!995 = !DILocation(line: 1916, column: 41, scope: !993)
!996 = !DILocalVariable(name: "__diffmax", scope: !993, file: !2, line: 1921, type: !997)
!997 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !69)
!998 = !DILocation(line: 1921, column: 15, scope: !993)
!999 = !DILocalVariable(name: "__allocmax", scope: !993, file: !2, line: 1923, type: !997)
!1000 = !DILocation(line: 1923, column: 15, scope: !993)
!1001 = !DILocation(line: 1923, column: 52, scope: !993)
!1002 = !DILocalVariable(name: "__a", arg: 1, scope: !1003, file: !33, line: 571, type: !115)
!1003 = distinct !DISubprogram(name: "max_size", linkageName: "_ZNSt16allocator_traitsISaIiEE8max_sizeERKS0_", scope: !32, file: !33, line: 571, type: !112, scopeLine: 572, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !111, retainedNodes: !138)
!1004 = !DILocation(line: 571, column: 38, scope: !1003, inlinedAt: !1005)
!1005 = distinct !DILocation(line: 1923, column: 28, scope: !993)
!1006 = !DILocation(line: 1924, column: 9, scope: !993)
!1007 = !DILocation(line: 1924, column: 2, scope: !993)
!1008 = distinct !DISubprogram(name: "min<unsigned long>", linkageName: "_ZSt3minImERKT_S2_S2_", scope: !15, file: !1009, line: 233, type: !1010, scopeLine: 234, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1014, retainedNodes: !138)
!1009 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_algobase.h", directory: "", checksumkind: CSK_MD5, checksum: "574810298133f03eba3456d6f78306fe")
!1010 = !DISubroutineType(types: !1011)
!1011 = !{!1012, !1012, !1012}
!1012 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !1013, size: 64)
!1013 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !71)
!1014 = !{!1015}
!1015 = !DITemplateTypeParameter(name: "_Tp", type: !71)
!1016 = !DILocalVariable(name: "__a", arg: 1, scope: !1008, file: !1009, line: 233, type: !1012)
!1017 = !DILocation(line: 233, column: 20, scope: !1008)
!1018 = !DILocalVariable(name: "__b", arg: 2, scope: !1008, file: !1009, line: 233, type: !1012)
!1019 = !DILocation(line: 233, column: 36, scope: !1008)
!1020 = !DILocation(line: 238, column: 11, scope: !1021)
!1021 = distinct !DILexicalBlock(scope: !1008, file: !1009, line: 238, column: 11)
!1022 = !DILocation(line: 238, column: 17, scope: !1021)
!1023 = !DILocation(line: 238, column: 15, scope: !1021)
!1024 = !DILocation(line: 239, column: 9, scope: !1021)
!1025 = !DILocation(line: 239, column: 2, scope: !1021)
!1026 = !DILocation(line: 240, column: 14, scope: !1008)
!1027 = !DILocation(line: 240, column: 7, scope: !1008)
!1028 = !DILocation(line: 241, column: 5, scope: !1008)
!1029 = distinct !DISubprogram(name: "_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implC2ERKS0_", scope: !21, file: !2, line: 146, type: !170, scopeLine: 148, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !169, retainedNodes: !138)
!1030 = !DILocalVariable(name: "this", arg: 1, scope: !1029, type: !882, flags: DIFlagArtificial | DIFlagObjectPointer)
!1031 = !DILocation(line: 0, scope: !1029)
!1032 = !DILocalVariable(name: "__a", arg: 2, scope: !1029, file: !2, line: 146, type: !172)
!1033 = !DILocation(line: 146, column: 37, scope: !1029)
!1034 = !DILocation(line: 147, column: 19, scope: !1029)
!1035 = !DILocation(line: 0, scope: !888, inlinedAt: !1036)
!1036 = distinct !DILocation(line: 147, column: 4, scope: !1029)
!1037 = !DILocation(line: 167, column: 34, scope: !888, inlinedAt: !1036)
!1038 = !DILocation(line: 168, column: 31, scope: !888, inlinedAt: !1036)
!1039 = !DILocation(line: 0, scope: !895, inlinedAt: !1040)
!1040 = distinct !DILocation(line: 168, column: 9, scope: !888, inlinedAt: !1036)
!1041 = !DILocation(line: 92, column: 45, scope: !895, inlinedAt: !1040)
!1042 = !DILocation(line: 146, column: 2, scope: !1029)
!1043 = !DILocation(line: 148, column: 4, scope: !1029)
!1044 = distinct !DISubprogram(name: "_M_create_storage", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_M_create_storageEm", scope: !18, file: !2, line: 396, type: !208, scopeLine: 397, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !233, retainedNodes: !138)
!1045 = !DILocalVariable(name: "this", arg: 1, scope: !1044, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!1046 = !DILocation(line: 0, scope: !1044)
!1047 = !DILocalVariable(name: "__n", arg: 2, scope: !1044, file: !2, line: 396, type: !69)
!1048 = !DILocation(line: 396, column: 32, scope: !1044)
!1049 = !DILocation(line: 398, column: 45, scope: !1044)
!1050 = !DILocation(line: 398, column: 33, scope: !1044)
!1051 = !DILocation(line: 398, column: 8, scope: !1044)
!1052 = !DILocation(line: 398, column: 16, scope: !1044)
!1053 = !DILocation(line: 398, column: 25, scope: !1044)
!1054 = !DILocation(line: 399, column: 34, scope: !1044)
!1055 = !DILocation(line: 399, column: 42, scope: !1044)
!1056 = !DILocation(line: 399, column: 8, scope: !1044)
!1057 = !DILocation(line: 399, column: 16, scope: !1044)
!1058 = !DILocation(line: 399, column: 26, scope: !1044)
!1059 = !DILocation(line: 400, column: 42, scope: !1044)
!1060 = !DILocation(line: 400, column: 50, scope: !1044)
!1061 = !DILocation(line: 400, column: 61, scope: !1044)
!1062 = !DILocation(line: 400, column: 59, scope: !1044)
!1063 = !DILocation(line: 400, column: 8, scope: !1044)
!1064 = !DILocation(line: 400, column: 16, scope: !1044)
!1065 = !DILocation(line: 400, column: 34, scope: !1044)
!1066 = !DILocation(line: 401, column: 7, scope: !1044)
!1067 = distinct !DISubprogram(name: "~_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD2Ev", scope: !21, file: !2, line: 133, type: !166, scopeLine: 133, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !1068, retainedNodes: !138)
!1068 = !DISubprogram(name: "~_Vector_impl", linkageName: "_ZNSt12_Vector_baseIiSaIiEE12_Vector_implD4Ev", scope: !21, type: !166, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: 0)
!1069 = !DILocalVariable(name: "this", arg: 1, scope: !1067, type: !882, flags: DIFlagArtificial | DIFlagObjectPointer)
!1070 = !DILocation(line: 0, scope: !1067)
!1071 = !DILocation(line: 0, scope: !704, inlinedAt: !1072)
!1072 = distinct !DILocation(line: 133, column: 14, scope: !1073)
!1073 = distinct !DILexicalBlock(scope: !1067, file: !2, line: 133, column: 14)
!1074 = !DILocation(line: 133, column: 14, scope: !1067)
!1075 = distinct !DISubprogram(name: "_M_allocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE11_M_allocateEm", scope: !18, file: !2, line: 378, type: !228, scopeLine: 379, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !227, retainedNodes: !138)
!1076 = !DILocalVariable(name: "this", arg: 1, scope: !1075, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!1077 = !DILocation(line: 0, scope: !1075)
!1078 = !DILocalVariable(name: "__n", arg: 2, scope: !1075, file: !2, line: 378, type: !69)
!1079 = !DILocation(line: 378, column: 26, scope: !1075)
!1080 = !DILocation(line: 381, column: 9, scope: !1075)
!1081 = !DILocation(line: 381, column: 13, scope: !1075)
!1082 = !DILocation(line: 381, column: 34, scope: !1075)
!1083 = !DILocation(line: 381, column: 43, scope: !1075)
!1084 = !DILocalVariable(name: "__a", arg: 1, scope: !1085, file: !33, line: 481, type: !41)
!1085 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSt16allocator_traitsISaIiEE8allocateERS0_m", scope: !32, file: !33, line: 481, type: !36, scopeLine: 482, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !35, retainedNodes: !138)
!1086 = !DILocation(line: 481, column: 32, scope: !1085, inlinedAt: !1087)
!1087 = distinct !DILocation(line: 381, column: 20, scope: !1075)
!1088 = !DILocalVariable(name: "__n", arg: 2, scope: !1085, file: !33, line: 481, type: !103)
!1089 = !DILocation(line: 481, column: 47, scope: !1085, inlinedAt: !1087)
!1090 = !DILocation(line: 482, column: 16, scope: !1085, inlinedAt: !1087)
!1091 = !DILocation(line: 482, column: 29, scope: !1085, inlinedAt: !1087)
!1092 = !DILocalVariable(name: "this", arg: 1, scope: !1093, type: !695, flags: DIFlagArtificial | DIFlagObjectPointer)
!1093 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSaIiE8allocateEm", scope: !43, file: !44, line: 189, type: !98, scopeLine: 190, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !97, retainedNodes: !138)
!1094 = !DILocation(line: 0, scope: !1093, inlinedAt: !1095)
!1095 = distinct !DILocation(line: 482, column: 20, scope: !1085, inlinedAt: !1087)
!1096 = !DILocalVariable(name: "__n", arg: 2, scope: !1093, file: !44, line: 189, type: !69)
!1097 = !DILocation(line: 189, column: 23, scope: !1093, inlinedAt: !1095)
!1098 = !DILocation(line: 198, column: 41, scope: !1093, inlinedAt: !1095)
!1099 = !DILocation(line: 198, column: 32, scope: !1093, inlinedAt: !1095)
!1100 = !DILocation(line: 381, column: 2, scope: !1075)
!1101 = distinct !DISubprogram(name: "allocate", linkageName: "_ZNSt15__new_allocatorIiE8allocateEmPKv", scope: !49, file: !50, line: 126, type: !66, scopeLine: 127, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !65, retainedNodes: !138)
!1102 = !DILocalVariable(name: "this", arg: 1, scope: !1101, type: !700, flags: DIFlagArtificial | DIFlagObjectPointer)
!1103 = !DILocation(line: 0, scope: !1101)
!1104 = !DILocalVariable(name: "__n", arg: 2, scope: !1101, file: !50, line: 126, type: !68)
!1105 = !DILocation(line: 126, column: 26, scope: !1101)
!1106 = !DILocalVariable(arg: 3, scope: !1101, file: !50, line: 126, type: !72)
!1107 = !DILocation(line: 126, column: 43, scope: !1101)
!1108 = !DILocation(line: 134, column: 23, scope: !1109)
!1109 = distinct !DILexicalBlock(scope: !1101, file: !50, line: 134, column: 6)
!1110 = !DILocalVariable(name: "this", arg: 1, scope: !1111, type: !1112, flags: DIFlagArtificial | DIFlagObjectPointer)
!1111 = distinct !DISubprogram(name: "_M_max_size", linkageName: "_ZNKSt15__new_allocatorIiE11_M_max_sizeEv", scope: !49, file: !50, line: 230, type: !78, scopeLine: 231, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !77, retainedNodes: !138)
!1112 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !60, size: 64)
!1113 = !DILocation(line: 0, scope: !1111, inlinedAt: !1114)
!1114 = distinct !DILocation(line: 134, column: 35, scope: !1109)
!1115 = !DILocation(line: 134, column: 27, scope: !1109)
!1116 = !DILocation(line: 134, column: 6, scope: !1109)
!1117 = !DILocation(line: 138, column: 10, scope: !1118)
!1118 = distinct !DILexicalBlock(scope: !1119, file: !50, line: 138, column: 10)
!1119 = distinct !DILexicalBlock(scope: !1109, file: !50, line: 135, column: 4)
!1120 = !DILocation(line: 138, column: 14, scope: !1118)
!1121 = !DILocation(line: 139, column: 8, scope: !1118)
!1122 = !DILocation(line: 140, column: 6, scope: !1119)
!1123 = !DILocation(line: 151, column: 49, scope: !1101)
!1124 = !DILocation(line: 151, column: 53, scope: !1101)
!1125 = !DILocation(line: 151, column: 27, scope: !1101)
!1126 = !DILocation(line: 151, column: 2, scope: !1101)
!1127 = distinct !DISubprogram(name: "__uninitialized_default_n_a<int *, unsigned long, int>", linkageName: "_ZSt27__uninitialized_default_n_aIPimiET_S1_T0_RSaIT1_E", scope: !15, file: !1128, line: 777, type: !1129, scopeLine: 779, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1131, retainedNodes: !138)
!1128 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_uninitialized.h", directory: "", checksumkind: CSK_MD5, checksum: "318d09ba72a8265560864b609bcb530f")
!1129 = !DISubroutineType(types: !1130)
!1130 = !{!39, !39, !71, !95}
!1131 = !{!858, !1132, !82}
!1132 = !DITemplateTypeParameter(name: "_Size", type: !71)
!1133 = !DILocalVariable(name: "__first", arg: 1, scope: !1127, file: !1128, line: 777, type: !39)
!1134 = !DILocation(line: 777, column: 50, scope: !1127)
!1135 = !DILocalVariable(name: "__n", arg: 2, scope: !1127, file: !1128, line: 777, type: !71)
!1136 = !DILocation(line: 777, column: 65, scope: !1127)
!1137 = !DILocalVariable(arg: 3, scope: !1127, file: !1128, line: 778, type: !95)
!1138 = !DILocation(line: 778, column: 20, scope: !1127)
!1139 = !DILocation(line: 779, column: 45, scope: !1127)
!1140 = !DILocation(line: 779, column: 54, scope: !1127)
!1141 = !DILocation(line: 779, column: 14, scope: !1127)
!1142 = !DILocation(line: 779, column: 7, scope: !1127)
!1143 = distinct !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 301, type: !186, scopeLine: 302, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !185, retainedNodes: !138)
!1144 = !DILocalVariable(name: "this", arg: 1, scope: !1143, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!1145 = !DILocation(line: 0, scope: !1143)
!1146 = !DILocation(line: 302, column: 22, scope: !1143)
!1147 = !DILocation(line: 302, column: 9, scope: !1143)
!1148 = distinct !DISubprogram(name: "__uninitialized_default_n<int *, unsigned long>", linkageName: "_ZSt25__uninitialized_default_nIPimET_S1_T0_", scope: !15, file: !1128, line: 696, type: !1149, scopeLine: 697, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1151, retainedNodes: !138)
!1149 = !DISubroutineType(types: !1150)
!1150 = !{!39, !39, !71}
!1151 = !{!858, !1132}
!1152 = !DILocalVariable(name: "__first", arg: 1, scope: !1148, file: !1128, line: 696, type: !39)
!1153 = !DILocation(line: 696, column: 48, scope: !1148)
!1154 = !DILocalVariable(name: "__n", arg: 2, scope: !1148, file: !1128, line: 696, type: !71)
!1155 = !DILocation(line: 696, column: 63, scope: !1148)
!1156 = !DILocalVariable(name: "__can_fill", scope: !1148, file: !1128, line: 707, type: !243)
!1157 = !DILocation(line: 707, column: 22, scope: !1148)
!1158 = !DILocation(line: 712, column: 21, scope: !1148)
!1159 = !DILocation(line: 712, column: 30, scope: !1148)
!1160 = !DILocation(line: 710, column: 14, scope: !1148)
!1161 = !DILocation(line: 710, column: 7, scope: !1148)
!1162 = distinct !DISubprogram(name: "__uninit_default_n<int *, unsigned long>", linkageName: "_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_", scope: !1163, file: !1128, line: 660, type: !1149, scopeLine: 661, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1151, declaration: !1166, retainedNodes: !138)
!1163 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__uninitialized_default_n_1<true>", scope: !15, file: !1128, line: 655, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1164, identifier: "_ZTSSt27__uninitialized_default_n_1ILb1EE")
!1164 = !{!1165}
!1165 = !DITemplateValueParameter(name: "_TrivialValueType", type: !131, value: i1 true)
!1166 = !DISubprogram(name: "__uninit_default_n<int *, unsigned long>", linkageName: "_ZNSt27__uninitialized_default_n_1ILb1EE18__uninit_default_nIPimEET_S3_T0_", scope: !1163, file: !1128, line: 660, type: !1149, scopeLine: 660, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0, templateParams: !1151)
!1167 = !DILocalVariable(name: "__first", arg: 1, scope: !1162, file: !1128, line: 660, type: !39)
!1168 = !DILocation(line: 660, column: 45, scope: !1162)
!1169 = !DILocalVariable(name: "__n", arg: 2, scope: !1162, file: !1128, line: 660, type: !71)
!1170 = !DILocation(line: 660, column: 60, scope: !1162)
!1171 = !DILocation(line: 662, column: 8, scope: !1172)
!1172 = distinct !DILexicalBlock(scope: !1162, file: !1128, line: 662, column: 8)
!1173 = !DILocation(line: 662, column: 12, scope: !1172)
!1174 = !DILocalVariable(name: "__val", scope: !1175, file: !1128, line: 664, type: !1176)
!1175 = distinct !DILexicalBlock(scope: !1172, file: !1128, line: 663, column: 6)
!1176 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1177, size: 64)
!1177 = !DIDerivedType(tag: DW_TAG_typedef, name: "value_type", scope: !376, file: !375, line: 202, baseType: !1178)
!1178 = !DIDerivedType(tag: DW_TAG_typedef, name: "remove_cv_t<int>", scope: !15, file: !239, line: 1591, baseType: !1179)
!1179 = !DIDerivedType(tag: DW_TAG_typedef, name: "type", scope: !1180, file: !239, line: 1543, baseType: !40)
!1180 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "remove_cv<int>", scope: !15, file: !239, line: 1542, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1181, identifier: "_ZTSSt9remove_cvIiE")
!1181 = !{!1182}
!1182 = !DITemplateTypeParameter(type: !40)
!1183 = !DILocation(line: 664, column: 64, scope: !1175)
!1184 = !DILocation(line: 665, column: 23, scope: !1175)
!1185 = !DILocation(line: 666, column: 24, scope: !1175)
!1186 = !DILocation(line: 666, column: 8, scope: !1175)
!1187 = !DILocation(line: 667, column: 8, scope: !1175)
!1188 = !DILocation(line: 668, column: 30, scope: !1175)
!1189 = !DILocation(line: 668, column: 39, scope: !1175)
!1190 = !DILocation(line: 668, column: 43, scope: !1175)
!1191 = !DILocation(line: 668, column: 49, scope: !1175)
!1192 = !DILocation(line: 668, column: 18, scope: !1175)
!1193 = !DILocation(line: 668, column: 16, scope: !1175)
!1194 = !DILocation(line: 669, column: 6, scope: !1175)
!1195 = !DILocation(line: 670, column: 11, scope: !1162)
!1196 = !DILocation(line: 670, column: 4, scope: !1162)
!1197 = distinct !DISubprogram(name: "_Construct<int>", linkageName: "_ZSt10_ConstructIiJEEvPT_DpOT0_", scope: !15, file: !1198, line: 109, type: !1199, scopeLine: 110, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1201, retainedNodes: !138)
!1198 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/stl_construct.h", directory: "", checksumkind: CSK_MD5, checksum: "2692aca002018b5b1663c464dddaf63f")
!1199 = !DISubroutineType(types: !1200)
!1200 = !{null, !39}
!1201 = !{!82, !1202}
!1202 = !DITemplateValueParameter(tag: DW_TAG_GNU_template_parameter_pack, name: "_Args", value: !138)
!1203 = !DILocalVariable(name: "__p", arg: 1, scope: !1197, file: !1198, line: 109, type: !39)
!1204 = !DILocation(line: 109, column: 21, scope: !1197)
!1205 = !DILocation(line: 119, column: 20, scope: !1197)
!1206 = !DILocation(line: 119, column: 7, scope: !1197)
!1207 = !DILocation(line: 120, column: 5, scope: !1197)
!1208 = distinct !DISubprogram(name: "fill_n<int *, unsigned long, int>", linkageName: "_ZSt6fill_nIPimiET_S1_T0_RKT1_", scope: !15, file: !1009, line: 1152, type: !1209, scopeLine: 1153, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1211, retainedNodes: !138)
!1209 = !DISubroutineType(types: !1210)
!1210 = !{!39, !39, !71, !442}
!1211 = !{!1212, !1132, !82}
!1212 = !DITemplateTypeParameter(name: "_OI", type: !39)
!1213 = !DILocalVariable(name: "__first", arg: 1, scope: !1208, file: !1009, line: 1152, type: !39)
!1214 = !DILocation(line: 1152, column: 16, scope: !1208)
!1215 = !DILocalVariable(name: "__n", arg: 2, scope: !1208, file: !1009, line: 1152, type: !71)
!1216 = !DILocation(line: 1152, column: 31, scope: !1208)
!1217 = !DILocalVariable(name: "__value", arg: 3, scope: !1208, file: !1009, line: 1152, type: !442)
!1218 = !DILocation(line: 1152, column: 47, scope: !1208)
!1219 = !DILocation(line: 1157, column: 30, scope: !1208)
!1220 = !DILocation(line: 1157, column: 62, scope: !1208)
!1221 = !DILocation(line: 1157, column: 39, scope: !1208)
!1222 = !DILocation(line: 1157, column: 68, scope: !1208)
!1223 = !{i64 4}
!1224 = !DILocalVariable(arg: 1, scope: !1225, file: !375, line: 239, type: !368)
!1225 = distinct !DISubprogram(name: "__iterator_category<int *>", linkageName: "_ZSt19__iterator_categoryIPiENSt15iterator_traitsIT_E17iterator_categoryERKS2_", scope: !15, file: !375, line: 239, type: !1226, scopeLine: 240, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1239, retainedNodes: !138)
!1226 = !DISubroutineType(types: !1227)
!1227 = !{!1228, !368}
!1228 = !DIDerivedType(tag: DW_TAG_typedef, name: "iterator_category", scope: !376, file: !375, line: 201, baseType: !1229)
!1229 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "random_access_iterator_tag", scope: !15, file: !375, line: 107, size: 8, flags: DIFlagTypePassByValue, elements: !1230, identifier: "_ZTSSt26random_access_iterator_tag")
!1230 = !{!1231}
!1231 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1229, baseType: !1232, extraData: i32 0)
!1232 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "bidirectional_iterator_tag", scope: !15, file: !375, line: 103, size: 8, flags: DIFlagTypePassByValue, elements: !1233, identifier: "_ZTSSt26bidirectional_iterator_tag")
!1233 = !{!1234}
!1234 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1232, baseType: !1235, extraData: i32 0)
!1235 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "forward_iterator_tag", scope: !15, file: !375, line: 99, size: 8, flags: DIFlagTypePassByValue, elements: !1236, identifier: "_ZTSSt20forward_iterator_tag")
!1236 = !{!1237}
!1237 = !DIDerivedType(tag: DW_TAG_inheritance, scope: !1235, baseType: !1238, extraData: i32 0)
!1238 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "input_iterator_tag", scope: !15, file: !375, line: 93, size: 8, flags: DIFlagTypePassByValue, elements: !138, identifier: "_ZTSSt18input_iterator_tag")
!1239 = !{!1240}
!1240 = !DITemplateTypeParameter(name: "_Iter", type: !39)
!1241 = !DILocation(line: 239, column: 37, scope: !1225, inlinedAt: !1242)
!1242 = distinct !DILocation(line: 1158, column: 11, scope: !1208)
!1243 = !DILocation(line: 1157, column: 14, scope: !1208)
!1244 = !DILocation(line: 1157, column: 7, scope: !1208)
!1245 = distinct !DISubprogram(name: "__fill_n_a<int *, unsigned long, int>", linkageName: "_ZSt10__fill_n_aIPimiET_S1_T0_RKT1_St26random_access_iterator_tag", scope: !15, file: !1009, line: 1117, type: !1246, scopeLine: 1119, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1248, retainedNodes: !138)
!1246 = !DISubroutineType(types: !1247)
!1247 = !{!39, !39, !71, !442, !1229}
!1248 = !{!1249, !1132, !82}
!1249 = !DITemplateTypeParameter(name: "_OutputIterator", type: !39)
!1250 = !DILocalVariable(name: "__first", arg: 1, scope: !1245, file: !1009, line: 1117, type: !39)
!1251 = !DILocation(line: 1117, column: 32, scope: !1245)
!1252 = !DILocalVariable(name: "__n", arg: 2, scope: !1245, file: !1009, line: 1117, type: !71)
!1253 = !DILocation(line: 1117, column: 47, scope: !1245)
!1254 = !DILocalVariable(name: "__value", arg: 3, scope: !1245, file: !1009, line: 1117, type: !442)
!1255 = !DILocation(line: 1117, column: 63, scope: !1245)
!1256 = !DILocalVariable(arg: 4, scope: !1245, file: !1009, line: 1118, type: !1229)
!1257 = !DILocation(line: 1118, column: 40, scope: !1245)
!1258 = !DILocation(line: 1123, column: 11, scope: !1259)
!1259 = distinct !DILexicalBlock(scope: !1245, file: !1009, line: 1123, column: 11)
!1260 = !DILocation(line: 1123, column: 15, scope: !1259)
!1261 = !DILocation(line: 1124, column: 9, scope: !1259)
!1262 = !DILocation(line: 1124, column: 2, scope: !1259)
!1263 = !DILocation(line: 1128, column: 21, scope: !1245)
!1264 = !DILocation(line: 1128, column: 30, scope: !1245)
!1265 = !DILocation(line: 1128, column: 40, scope: !1245)
!1266 = !DILocation(line: 1128, column: 38, scope: !1245)
!1267 = !DILocation(line: 1128, column: 45, scope: !1245)
!1268 = !DILocation(line: 1128, column: 7, scope: !1245)
!1269 = !DILocation(line: 1129, column: 14, scope: !1245)
!1270 = !DILocation(line: 1129, column: 24, scope: !1245)
!1271 = !DILocation(line: 1129, column: 22, scope: !1245)
!1272 = !DILocation(line: 1129, column: 7, scope: !1245)
!1273 = !DILocation(line: 1130, column: 5, scope: !1245)
!1274 = distinct !DISubprogram(name: "__size_to_integer", linkageName: "_ZSt17__size_to_integerm", scope: !15, file: !1009, line: 1018, type: !1275, scopeLine: 1018, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, retainedNodes: !138)
!1275 = !DISubroutineType(types: !1276)
!1276 = !{!71, !71}
!1277 = !DILocalVariable(name: "__n", arg: 1, scope: !1274, file: !1009, line: 1018, type: !71)
!1278 = !DILocation(line: 1018, column: 35, scope: !1274)
!1279 = !DILocation(line: 1018, column: 49, scope: !1274)
!1280 = !DILocation(line: 1018, column: 42, scope: !1274)
!1281 = distinct !DISubprogram(name: "__fill_a<int *, int>", linkageName: "_ZSt8__fill_aIPiiEvT_S1_RKT0_", scope: !15, file: !1009, line: 976, type: !1282, scopeLine: 977, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1284, retainedNodes: !138)
!1282 = !DISubroutineType(types: !1283)
!1283 = !{null, !39, !39, !442}
!1284 = !{!1285, !82}
!1285 = !DITemplateTypeParameter(name: "_FIte", type: !39)
!1286 = !DILocalVariable(name: "__first", arg: 1, scope: !1281, file: !1009, line: 976, type: !39)
!1287 = !DILocation(line: 976, column: 20, scope: !1281)
!1288 = !DILocalVariable(name: "__last", arg: 2, scope: !1281, file: !1009, line: 976, type: !39)
!1289 = !DILocation(line: 976, column: 35, scope: !1281)
!1290 = !DILocalVariable(name: "__value", arg: 3, scope: !1281, file: !1009, line: 976, type: !442)
!1291 = !DILocation(line: 976, column: 54, scope: !1281)
!1292 = !DILocation(line: 977, column: 22, scope: !1281)
!1293 = !DILocation(line: 977, column: 31, scope: !1281)
!1294 = !DILocation(line: 977, column: 39, scope: !1281)
!1295 = !DILocation(line: 977, column: 7, scope: !1281)
!1296 = !DILocation(line: 977, column: 49, scope: !1281)
!1297 = distinct !DISubprogram(name: "__fill_a1<int *, int>", linkageName: "_ZSt9__fill_a1IPiiEN9__gnu_cxx11__enable_ifIXsr11__is_scalarIT0_EE7__valueEvE6__typeET_S6_RKS3_", scope: !15, file: !1009, line: 926, type: !1298, scopeLine: 928, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !857, retainedNodes: !138)
!1298 = !DISubroutineType(types: !1299)
!1299 = !{!1300, !39, !39, !442}
!1300 = !DIDerivedType(tag: DW_TAG_typedef, name: "__type", scope: !1302, file: !1301, line: 50, baseType: null)
!1301 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/ext/type_traits.h", directory: "")
!1302 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__enable_if<true, void>", scope: !29, file: !1301, line: 49, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1303, identifier: "_ZTSN9__gnu_cxx11__enable_ifILb1EvEE")
!1303 = !{!1304, !1305}
!1304 = !DITemplateValueParameter(type: !131, value: i1 true)
!1305 = !DITemplateTypeParameter(type: null)
!1306 = !DILocalVariable(name: "__first", arg: 1, scope: !1297, file: !1009, line: 926, type: !39)
!1307 = !DILocation(line: 926, column: 32, scope: !1297)
!1308 = !DILocalVariable(name: "__last", arg: 2, scope: !1297, file: !1009, line: 926, type: !39)
!1309 = !DILocation(line: 926, column: 58, scope: !1297)
!1310 = !DILocalVariable(name: "__value", arg: 3, scope: !1297, file: !1009, line: 927, type: !442)
!1311 = !DILocation(line: 927, column: 19, scope: !1297)
!1312 = !DILocalVariable(name: "__tmp", scope: !1297, file: !1009, line: 929, type: !424)
!1313 = !DILocation(line: 929, column: 17, scope: !1297)
!1314 = !DILocation(line: 929, column: 25, scope: !1297)
!1315 = !DILocation(line: 930, column: 7, scope: !1297)
!1316 = !DILocation(line: 930, column: 14, scope: !1317)
!1317 = distinct !DILexicalBlock(scope: !1318, file: !1009, line: 930, column: 7)
!1318 = distinct !DILexicalBlock(scope: !1297, file: !1009, line: 930, column: 7)
!1319 = !DILocation(line: 930, column: 25, scope: !1317)
!1320 = !DILocation(line: 930, column: 22, scope: !1317)
!1321 = !DILocation(line: 930, column: 7, scope: !1318)
!1322 = !DILocation(line: 931, column: 13, scope: !1317)
!1323 = !DILocation(line: 931, column: 3, scope: !1317)
!1324 = !DILocation(line: 931, column: 11, scope: !1317)
!1325 = !DILocation(line: 931, column: 2, scope: !1317)
!1326 = !DILocation(line: 930, column: 33, scope: !1317)
!1327 = !DILocation(line: 930, column: 7, scope: !1317)
!1328 = distinct !{!1328, !1321, !1329, !777}
!1329 = !DILocation(line: 931, column: 13, scope: !1318)
!1330 = !DILocation(line: 932, column: 5, scope: !1297)
!1331 = distinct !DISubprogram(name: "_M_deallocate", linkageName: "_ZNSt12_Vector_baseIiSaIiEE13_M_deallocateEPim", scope: !18, file: !2, line: 386, type: !231, scopeLine: 387, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !230, retainedNodes: !138)
!1332 = !DILocalVariable(name: "this", arg: 1, scope: !1331, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!1333 = !DILocation(line: 0, scope: !1331)
!1334 = !DILocalVariable(name: "__p", arg: 2, scope: !1331, file: !2, line: 386, type: !144)
!1335 = !DILocation(line: 386, column: 29, scope: !1331)
!1336 = !DILocalVariable(name: "__n", arg: 3, scope: !1331, file: !2, line: 386, type: !69)
!1337 = !DILocation(line: 386, column: 41, scope: !1331)
!1338 = !DILocation(line: 389, column: 6, scope: !1339)
!1339 = distinct !DILexicalBlock(scope: !1331, file: !2, line: 389, column: 6)
!1340 = !DILocation(line: 390, column: 20, scope: !1339)
!1341 = !DILocation(line: 390, column: 29, scope: !1339)
!1342 = !DILocation(line: 390, column: 34, scope: !1339)
!1343 = !DILocalVariable(name: "__a", arg: 1, scope: !1344, file: !33, line: 516, type: !41)
!1344 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSt16allocator_traitsISaIiEE10deallocateERS0_Pim", scope: !32, file: !33, line: 516, type: !109, scopeLine: 517, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !108, retainedNodes: !138)
!1345 = !DILocation(line: 516, column: 34, scope: !1344, inlinedAt: !1346)
!1346 = distinct !DILocation(line: 390, column: 4, scope: !1339)
!1347 = !DILocalVariable(name: "__p", arg: 2, scope: !1344, file: !33, line: 516, type: !38)
!1348 = !DILocation(line: 516, column: 47, scope: !1344, inlinedAt: !1346)
!1349 = !DILocalVariable(name: "__n", arg: 3, scope: !1344, file: !33, line: 516, type: !103)
!1350 = !DILocation(line: 516, column: 62, scope: !1344, inlinedAt: !1346)
!1351 = !DILocation(line: 517, column: 9, scope: !1344, inlinedAt: !1346)
!1352 = !DILocation(line: 517, column: 24, scope: !1344, inlinedAt: !1346)
!1353 = !DILocation(line: 517, column: 29, scope: !1344, inlinedAt: !1346)
!1354 = !DILocalVariable(name: "this", arg: 1, scope: !1355, type: !695, flags: DIFlagArtificial | DIFlagObjectPointer)
!1355 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSaIiE10deallocateEPim", scope: !43, file: !44, line: 203, type: !101, scopeLine: 204, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !100, retainedNodes: !138)
!1356 = !DILocation(line: 0, scope: !1355, inlinedAt: !1357)
!1357 = distinct !DILocation(line: 517, column: 13, scope: !1344, inlinedAt: !1346)
!1358 = !DILocalVariable(name: "__p", arg: 2, scope: !1355, file: !44, line: 203, type: !39)
!1359 = !DILocation(line: 203, column: 23, scope: !1355, inlinedAt: !1357)
!1360 = !DILocalVariable(name: "__n", arg: 3, scope: !1355, file: !44, line: 203, type: !69)
!1361 = !DILocation(line: 203, column: 35, scope: !1355, inlinedAt: !1357)
!1362 = !DILocation(line: 210, column: 36, scope: !1355, inlinedAt: !1357)
!1363 = !DILocation(line: 210, column: 41, scope: !1355, inlinedAt: !1357)
!1364 = !DILocation(line: 210, column: 25, scope: !1355, inlinedAt: !1357)
!1365 = !DILocation(line: 390, column: 4, scope: !1339)
!1366 = !DILocation(line: 391, column: 7, scope: !1331)
!1367 = distinct !DISubprogram(name: "deallocate", linkageName: "_ZNSt15__new_allocatorIiE10deallocateEPim", scope: !49, file: !50, line: 156, type: !75, scopeLine: 157, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !74, retainedNodes: !138)
!1368 = !DILocalVariable(name: "this", arg: 1, scope: !1367, type: !700, flags: DIFlagArtificial | DIFlagObjectPointer)
!1369 = !DILocation(line: 0, scope: !1367)
!1370 = !DILocalVariable(name: "__p", arg: 2, scope: !1367, file: !50, line: 156, type: !39)
!1371 = !DILocation(line: 156, column: 23, scope: !1367)
!1372 = !DILocalVariable(name: "__n", arg: 3, scope: !1367, file: !50, line: 156, type: !68)
!1373 = !DILocation(line: 156, column: 38, scope: !1367)
!1374 = !DILocation(line: 172, column: 50, scope: !1367)
!1375 = !DILocation(line: 172, column: 55, scope: !1367)
!1376 = !DILocation(line: 172, column: 27, scope: !1367)
!1377 = !DILocation(line: 172, column: 2, scope: !1367)
!1378 = !DILocation(line: 173, column: 7, scope: !1367)
!1379 = distinct !DISubprogram(name: "operator==<int *, std::vector<int, std::allocator<int> > >", linkageName: "_ZN9__gnu_cxxeqIPiSt6vectorIiSaIiEEEEbRKNS_17__normal_iteratorIT_T0_EESA_QrqXeqcldtfp_4baseEcldtfp0_4baseERSt14convertible_toIbEE", scope: !29, file: !358, line: 1197, type: !1380, scopeLine: 1203, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !414, retainedNodes: !138)
!1380 = !DISubroutineType(types: !1381)
!1381 = !{!131, !1382, !1382}
!1382 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !381, size: 64)
!1383 = !DILocalVariable(name: "__lhs", arg: 1, scope: !1379, file: !358, line: 1197, type: !1382)
!1384 = !DILocation(line: 1197, column: 64, scope: !1379)
!1385 = !DILocalVariable(name: "__rhs", arg: 2, scope: !1379, file: !358, line: 1198, type: !1382)
!1386 = !DILocation(line: 1198, column: 57, scope: !1379)
!1387 = !DILocation(line: 1203, column: 14, scope: !1379)
!1388 = !DILocation(line: 1203, column: 20, scope: !1379)
!1389 = !DILocation(line: 1203, column: 30, scope: !1379)
!1390 = !DILocation(line: 1203, column: 36, scope: !1379)
!1391 = !DILocation(line: 1203, column: 27, scope: !1379)
!1392 = !DILocation(line: 1203, column: 7, scope: !1379)
!1393 = distinct !DISubprogram(name: "operator*", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEdeEv", scope: !357, file: !358, line: 1099, type: !371, scopeLine: 1100, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !370, retainedNodes: !138)
!1394 = !DILocalVariable(name: "this", arg: 1, scope: !1393, type: !1395, flags: DIFlagArtificial | DIFlagObjectPointer)
!1395 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !381, size: 64)
!1396 = !DILocation(line: 0, scope: !1393)
!1397 = !DILocation(line: 1100, column: 17, scope: !1393)
!1398 = !DILocation(line: 1100, column: 9, scope: !1393)
!1399 = distinct !DISubprogram(name: "operator++", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEppEv", scope: !357, file: !358, line: 1109, type: !388, scopeLine: 1110, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !387, retainedNodes: !138)
!1400 = !DILocalVariable(name: "this", arg: 1, scope: !1399, type: !1401, flags: DIFlagArtificial | DIFlagObjectPointer)
!1401 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !357, size: 64)
!1402 = !DILocation(line: 0, scope: !1399)
!1403 = !DILocation(line: 1111, column: 4, scope: !1399)
!1404 = !DILocation(line: 1111, column: 2, scope: !1399)
!1405 = !DILocation(line: 1112, column: 2, scope: !1399)
!1406 = distinct !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEE4baseEv", scope: !357, file: !358, line: 1162, type: !412, scopeLine: 1163, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !411, retainedNodes: !138)
!1407 = !DILocalVariable(name: "this", arg: 1, scope: !1406, type: !1395, flags: DIFlagArtificial | DIFlagObjectPointer)
!1408 = !DILocation(line: 0, scope: !1406)
!1409 = !DILocation(line: 1163, column: 16, scope: !1406)
!1410 = !DILocation(line: 1163, column: 9, scope: !1406)
!1411 = distinct !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPiSt6vectorIiSaIiEEEC2ERKS1_", scope: !357, file: !358, line: 1076, type: !366, scopeLine: 1077, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !365, retainedNodes: !138)
!1412 = !DILocalVariable(name: "this", arg: 1, scope: !1411, type: !1401, flags: DIFlagArtificial | DIFlagObjectPointer)
!1413 = !DILocation(line: 0, scope: !1411)
!1414 = !DILocalVariable(name: "__i", arg: 2, scope: !1411, file: !358, line: 1076, type: !368)
!1415 = !DILocation(line: 1076, column: 42, scope: !1411)
!1416 = !DILocation(line: 1077, column: 9, scope: !1411)
!1417 = !DILocation(line: 1077, column: 20, scope: !1411)
!1418 = !DILocation(line: 1077, column: 27, scope: !1411)
!1419 = distinct !DISubprogram(name: "operator()", linkageName: "_ZZ7advance3EnviENK3$_0clE3Boxi", scope: !676, file: !9, line: 34, type: !1420, scopeLine: 34, flags: DIFlagPrototyped, spFlags: DISPFlagLocalToUnit | DISPFlagDefinition, unit: !8, declaration: !1424, retainedNodes: !138)
!1420 = !DISubroutineType(types: !1421)
!1421 = !{!11, !1422, !11, !40}
!1422 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1423, size: 64, flags: DIFlagArtificial | DIFlagObjectPointer)
!1423 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !676)
!1424 = !DISubprogram(name: "operator()", scope: !676, file: !9, line: 34, type: !1420, scopeLine: 34, flags: DIFlagPublic | DIFlagPrototyped, spFlags: DISPFlagLocalToUnit)
!1425 = !DILocalVariable(name: "this", arg: 1, scope: !1419, type: !1426, flags: DIFlagArtificial | DIFlagObjectPointer)
!1426 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !1423, size: 64)
!1427 = !DILocation(line: 0, scope: !1419)
!1428 = !DILocalVariable(name: "acc", arg: 2, scope: !1419, file: !9, line: 34, type: !11)
!1429 = !DILocation(line: 34, column: 14, scope: !1419)
!1430 = !DILocalVariable(name: "layer", arg: 3, scope: !1419, file: !9, line: 34, type: !40)
!1431 = !DILocation(line: 34, column: 23, scope: !1419)
!1432 = !DILocalVariable(name: "bucket", scope: !1419, file: !9, line: 35, type: !1433)
!1433 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !615, size: 64)
!1434 = !DILocation(line: 35, column: 15, scope: !1419)
!1435 = !DILocation(line: 35, column: 28, scope: !1419)
!1436 = !DILocation(line: 36, column: 13, scope: !1437)
!1437 = distinct !DILexicalBlock(scope: !1419, file: !9, line: 36, column: 13)
!1438 = !DILocation(line: 36, column: 19, scope: !1437)
!1439 = !DILocation(line: 36, column: 23, scope: !1437)
!1440 = !DILocation(line: 37, column: 13, scope: !1437)
!1441 = !DILocation(line: 37, column: 20, scope: !1437)
!1442 = !DILocation(line: 37, column: 11, scope: !1437)
!1443 = !DILocation(line: 39, column: 11, scope: !1437)
!1444 = !DILocation(line: 39, column: 18, scope: !1437)
!1445 = !DILocation(line: 39, column: 25, scope: !1437)
!1446 = !DILocation(line: 40, column: 16, scope: !1419)
!1447 = !DILocation(line: 40, column: 9, scope: !1419)
!1448 = distinct !DISubprogram(name: "operator=", linkageName: "_ZN3BoxaSEOS_", scope: !11, file: !9, line: 12, type: !1449, scopeLine: 12, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !1452, retainedNodes: !138)
!1449 = !DISubroutineType(types: !1450)
!1450 = !{!1451, !659, !660}
!1451 = !DIDerivedType(tag: DW_TAG_reference_type, baseType: !11, size: 64)
!1452 = !DISubprogram(name: "operator=", linkageName: "_ZN3BoxaSEOS_", scope: !11, type: !1449, flags: DIFlagArtificial | DIFlagPrototyped, spFlags: 0)
!1453 = !DILocalVariable(name: "this", arg: 1, scope: !1448, type: !663, flags: DIFlagArtificial | DIFlagObjectPointer)
!1454 = !DILocation(line: 0, scope: !1448)
!1455 = !DILocalVariable(arg: 2, scope: !1448, type: !660, flags: DIFlagArtificial)
!1456 = !DILocation(line: 12, column: 8, scope: !1457)
!1457 = distinct !DILexicalBlock(scope: !1448, file: !9, line: 12, column: 8)
!1458 = distinct !DISubprogram(name: "operator=", linkageName: "_ZNSt6vectorIiSaIiEEaSEOS1_", scope: !14, file: !2, line: 766, type: !342, scopeLine: 767, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !341, retainedNodes: !138)
!1459 = !DILocalVariable(name: "this", arg: 1, scope: !1458, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!1460 = !DILocation(line: 0, scope: !1458)
!1461 = !DILocalVariable(name: "__x", arg: 2, scope: !1458, file: !2, line: 766, type: !311)
!1462 = !DILocation(line: 766, column: 26, scope: !1458)
!1463 = !DILocalVariable(name: "__move_storage", scope: !1458, file: !2, line: 768, type: !243)
!1464 = !DILocation(line: 768, column: 17, scope: !1458)
!1465 = !DILocation(line: 771, column: 27, scope: !1458)
!1466 = !DILocation(line: 771, column: 2, scope: !1458)
!1467 = !DILocation(line: 772, column: 2, scope: !1458)
!1468 = distinct !DISubprogram(name: "_M_move_assign", linkageName: "_ZNSt6vectorIiSaIiEE14_M_move_assignEOS1_St17integral_constantIbLb1EE", scope: !14, file: !2, line: 1959, type: !607, scopeLine: 1960, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !606, retainedNodes: !138)
!1469 = !DILocalVariable(name: "this", arg: 1, scope: !1468, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!1470 = !DILocation(line: 0, scope: !1468)
!1471 = !DILocalVariable(name: "__x", arg: 2, scope: !1468, file: !2, line: 1959, type: !311)
!1472 = !DILocation(line: 1959, column: 31, scope: !1468)
!1473 = !DILocalVariable(arg: 3, scope: !1468, file: !2, line: 1959, type: !238)
!1474 = !DILocation(line: 1959, column: 45, scope: !1468)
!1475 = !DILocalVariable(name: "__tmp", scope: !1468, file: !2, line: 1961, type: !14)
!1476 = !DILocation(line: 1961, column: 9, scope: !1468)
!1477 = !DILocation(line: 1961, column: 15, scope: !1468)
!1478 = !DILocation(line: 0, scope: !704, inlinedAt: !1479)
!1479 = distinct !DILocation(line: 1961, column: 9, scope: !1468)
!1480 = !DILocation(line: 1962, column: 8, scope: !1468)
!1481 = !DILocation(line: 1962, column: 29, scope: !1468)
!1482 = !DILocation(line: 1962, column: 33, scope: !1468)
!1483 = !DILocation(line: 1962, column: 16, scope: !1468)
!1484 = !DILocation(line: 1963, column: 8, scope: !1468)
!1485 = !DILocation(line: 1963, column: 29, scope: !1468)
!1486 = !DILocation(line: 1963, column: 33, scope: !1468)
!1487 = !DILocation(line: 1963, column: 16, scope: !1468)
!1488 = !DILocation(line: 1964, column: 23, scope: !1468)
!1489 = !DILocation(line: 1964, column: 46, scope: !1468)
!1490 = !DILocation(line: 1964, column: 50, scope: !1468)
!1491 = !DILocalVariable(name: "__one", arg: 1, scope: !1492, file: !33, line: 748, type: !95)
!1492 = distinct !DISubprogram(name: "__alloc_on_move<std::allocator<int> >", linkageName: "_ZSt15__alloc_on_moveISaIiEEvRT_S2_", scope: !15, file: !33, line: 748, type: !126, scopeLine: 749, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !120, retainedNodes: !138)
!1493 = !DILocation(line: 748, column: 29, scope: !1492, inlinedAt: !1494)
!1494 = distinct !DILocation(line: 1964, column: 2, scope: !1468)
!1495 = !DILocalVariable(name: "__two", arg: 2, scope: !1492, file: !33, line: 748, type: !95)
!1496 = !DILocation(line: 748, column: 44, scope: !1492, inlinedAt: !1494)
!1497 = !DILocation(line: 755, column: 20, scope: !1498, inlinedAt: !1494)
!1498 = distinct !DILexicalBlock(scope: !1492, file: !33, line: 754, column: 21)
!1499 = !DILocation(line: 755, column: 2, scope: !1498, inlinedAt: !1494)
!1500 = !DILocation(line: 759, column: 5, scope: !1492, inlinedAt: !1494)
!1501 = !DILocation(line: 1965, column: 7, scope: !1468)
!1502 = !DILocation(line: 1964, column: 2, scope: !1468)
!1503 = distinct !DISubprogram(name: "get_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE13get_allocatorEv", scope: !18, file: !2, line: 311, type: !196, scopeLine: 312, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !195, retainedNodes: !138)
!1504 = !DILocalVariable(name: "this", arg: 1, scope: !1503, type: !1505, flags: DIFlagArtificial | DIFlagObjectPointer)
!1505 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !194, size: 64)
!1506 = !DILocation(line: 0, scope: !1503)
!1507 = !DILocation(line: 312, column: 31, scope: !1503)
!1508 = !DILocation(line: 0, scope: !888, inlinedAt: !1509)
!1509 = distinct !DILocation(line: 312, column: 16, scope: !1503)
!1510 = !DILocation(line: 167, column: 34, scope: !888, inlinedAt: !1509)
!1511 = !DILocation(line: 168, column: 31, scope: !888, inlinedAt: !1509)
!1512 = !DILocation(line: 0, scope: !895, inlinedAt: !1513)
!1513 = distinct !DILocation(line: 168, column: 9, scope: !888, inlinedAt: !1509)
!1514 = !DILocation(line: 92, column: 45, scope: !895, inlinedAt: !1513)
!1515 = !DILocation(line: 312, column: 9, scope: !1503)
!1516 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2ERKS0_", scope: !14, file: !2, line: 542, type: !288, scopeLine: 543, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !287, retainedNodes: !138)
!1517 = !DILocalVariable(name: "this", arg: 1, scope: !1516, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!1518 = !DILocation(line: 0, scope: !1516)
!1519 = !DILocalVariable(name: "__a", arg: 2, scope: !1516, file: !2, line: 542, type: !290)
!1520 = !DILocation(line: 542, column: 36, scope: !1516)
!1521 = !DILocation(line: 543, column: 15, scope: !1516)
!1522 = !DILocation(line: 543, column: 9, scope: !1516)
!1523 = !DILocation(line: 543, column: 22, scope: !1516)
!1524 = distinct !DISubprogram(name: "_M_swap_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_swap_dataERS2_", scope: !141, file: !2, line: 122, type: !162, scopeLine: 123, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !161, retainedNodes: !138)
!1525 = !DILocalVariable(name: "this", arg: 1, scope: !1524, type: !905, flags: DIFlagArtificial | DIFlagObjectPointer)
!1526 = !DILocation(line: 0, scope: !1524)
!1527 = !DILocalVariable(name: "__x", arg: 2, scope: !1524, file: !2, line: 122, type: !164)
!1528 = !DILocation(line: 122, column: 34, scope: !1524)
!1529 = !DILocalVariable(name: "__tmp", scope: !1524, file: !2, line: 126, type: !141)
!1530 = !DILocation(line: 126, column: 22, scope: !1524)
!1531 = !DILocation(line: 127, column: 10, scope: !1524)
!1532 = !DILocation(line: 128, column: 17, scope: !1524)
!1533 = !DILocation(line: 128, column: 4, scope: !1524)
!1534 = !DILocation(line: 129, column: 4, scope: !1524)
!1535 = !DILocation(line: 129, column: 8, scope: !1524)
!1536 = !DILocation(line: 130, column: 2, scope: !1524)
!1537 = distinct !DISubprogram(name: "_M_get_Tp_allocator", linkageName: "_ZNKSt12_Vector_baseIiSaIiEE19_M_get_Tp_allocatorEv", scope: !18, file: !2, line: 306, type: !191, scopeLine: 307, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !190, retainedNodes: !138)
!1538 = !DILocalVariable(name: "this", arg: 1, scope: !1537, type: !1505, flags: DIFlagArtificial | DIFlagObjectPointer)
!1539 = !DILocation(line: 0, scope: !1537)
!1540 = !DILocation(line: 307, column: 22, scope: !1537)
!1541 = !DILocation(line: 307, column: 9, scope: !1537)
!1542 = distinct !DISubprogram(name: "_Vector_base", linkageName: "_ZNSt12_Vector_baseIiSaIiEEC2ERKS0_", scope: !18, file: !2, line: 321, type: !203, scopeLine: 322, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !202, retainedNodes: !138)
!1543 = !DILocalVariable(name: "this", arg: 1, scope: !1542, type: !874, flags: DIFlagArtificial | DIFlagObjectPointer)
!1544 = !DILocation(line: 0, scope: !1542)
!1545 = !DILocalVariable(name: "__a", arg: 2, scope: !1542, file: !2, line: 321, type: !205)
!1546 = !DILocation(line: 321, column: 42, scope: !1542)
!1547 = !DILocation(line: 322, column: 9, scope: !1542)
!1548 = !DILocation(line: 322, column: 17, scope: !1542)
!1549 = !DILocation(line: 322, column: 24, scope: !1542)
!1550 = distinct !DISubprogram(name: "_Vector_impl_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_dataC2Ev", scope: !141, file: !2, line: 99, type: !149, scopeLine: 101, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !148, retainedNodes: !138)
!1551 = !DILocalVariable(name: "this", arg: 1, scope: !1550, type: !905, flags: DIFlagArtificial | DIFlagObjectPointer)
!1552 = !DILocation(line: 0, scope: !1550)
!1553 = !DILocation(line: 100, column: 4, scope: !1550)
!1554 = !DILocation(line: 100, column: 16, scope: !1550)
!1555 = !DILocation(line: 100, column: 29, scope: !1550)
!1556 = !DILocation(line: 101, column: 4, scope: !1550)
!1557 = distinct !DISubprogram(name: "_M_copy_data", linkageName: "_ZNSt12_Vector_baseIiSaIiEE17_Vector_impl_data12_M_copy_dataERKS2_", scope: !141, file: !2, line: 113, type: !157, scopeLine: 114, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !156, retainedNodes: !138)
!1558 = !DILocalVariable(name: "this", arg: 1, scope: !1557, type: !905, flags: DIFlagArtificial | DIFlagObjectPointer)
!1559 = !DILocation(line: 0, scope: !1557)
!1560 = !DILocalVariable(name: "__x", arg: 2, scope: !1557, file: !2, line: 113, type: !159)
!1561 = !DILocation(line: 113, column: 40, scope: !1557)
!1562 = !DILocation(line: 115, column: 15, scope: !1557)
!1563 = !DILocation(line: 115, column: 19, scope: !1557)
!1564 = !DILocation(line: 115, column: 4, scope: !1557)
!1565 = !DILocation(line: 115, column: 13, scope: !1557)
!1566 = !DILocation(line: 116, column: 16, scope: !1557)
!1567 = !DILocation(line: 116, column: 20, scope: !1557)
!1568 = !DILocation(line: 116, column: 4, scope: !1557)
!1569 = !DILocation(line: 116, column: 14, scope: !1557)
!1570 = !DILocation(line: 117, column: 24, scope: !1557)
!1571 = !DILocation(line: 117, column: 28, scope: !1557)
!1572 = !DILocation(line: 117, column: 4, scope: !1557)
!1573 = !DILocation(line: 117, column: 22, scope: !1557)
!1574 = !DILocation(line: 118, column: 2, scope: !1557)
!1575 = distinct !DISubprogram(name: "vector", linkageName: "_ZNSt6vectorIiSaIiEEC2ERKS1_", scope: !14, file: !2, line: 601, type: !304, scopeLine: 604, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !303, retainedNodes: !138)
!1576 = !DILocalVariable(name: "this", arg: 1, scope: !1575, type: !727, flags: DIFlagArtificial | DIFlagObjectPointer)
!1577 = !DILocation(line: 0, scope: !1575)
!1578 = !DILocalVariable(name: "__x", arg: 2, scope: !1575, file: !2, line: 601, type: !306)
!1579 = !DILocation(line: 601, column: 28, scope: !1575)
!1580 = !DILocation(line: 602, column: 15, scope: !1575)
!1581 = !DILocation(line: 602, column: 19, scope: !1575)
!1582 = !DILocation(line: 603, column: 35, scope: !1575)
!1583 = !DILocation(line: 603, column: 39, scope: !1575)
!1584 = !{!1585}
!1585 = distinct !{!1585, !1586, !"_ZN9__gnu_cxx14__alloc_traitsISaIiEiE17_S_select_on_copyERKS1_: argument 0"}
!1586 = distinct !{!1586, !"_ZN9__gnu_cxx14__alloc_traitsISaIiEiE17_S_select_on_copyERKS1_"}
!1587 = !DILocation(line: 603, column: 2, scope: !1575)
!1588 = !DILocalVariable(name: "__a", arg: 1, scope: !1589, file: !26, line: 97, type: !90)
!1589 = distinct !DISubprogram(name: "_S_select_on_copy", linkageName: "_ZN9__gnu_cxx14__alloc_traitsISaIiEiE17_S_select_on_copyERKS1_", scope: !28, file: !26, line: 97, type: !123, scopeLine: 98, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !122, retainedNodes: !138)
!1590 = !DILocation(line: 97, column: 61, scope: !1589, inlinedAt: !1591)
!1591 = distinct !DILocation(line: 603, column: 2, scope: !1575)
!1592 = !DILocation(line: 98, column: 64, scope: !1589, inlinedAt: !1591)
!1593 = !{!1594}
!1594 = distinct !{!1594, !1595, !"_ZNSt16allocator_traitsISaIiEE37select_on_container_copy_constructionERKS0_: argument 0"}
!1595 = distinct !{!1595, !"_ZNSt16allocator_traitsISaIiEE37select_on_container_copy_constructionERKS0_"}
!1596 = !DILocation(line: 98, column: 14, scope: !1589, inlinedAt: !1591)
!1597 = !DILocalVariable(name: "__rhs", arg: 1, scope: !1598, file: !33, line: 587, type: !115)
!1598 = distinct !DISubprogram(name: "select_on_container_copy_construction", linkageName: "_ZNSt16allocator_traitsISaIiEE37select_on_container_copy_constructionERKS0_", scope: !32, file: !33, line: 587, type: !118, scopeLine: 588, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !117, retainedNodes: !138)
!1599 = !DILocation(line: 587, column: 67, scope: !1598, inlinedAt: !1600)
!1600 = distinct !DILocation(line: 98, column: 14, scope: !1589, inlinedAt: !1591)
!1601 = !DILocation(line: 588, column: 16, scope: !1598, inlinedAt: !1600)
!1602 = !DILocation(line: 0, scope: !888, inlinedAt: !1603)
!1603 = distinct !DILocation(line: 588, column: 16, scope: !1598, inlinedAt: !1600)
!1604 = !DILocation(line: 167, column: 34, scope: !888, inlinedAt: !1603)
!1605 = !DILocation(line: 168, column: 31, scope: !888, inlinedAt: !1603)
!1606 = !DILocation(line: 0, scope: !895, inlinedAt: !1607)
!1607 = distinct !DILocation(line: 168, column: 9, scope: !888, inlinedAt: !1603)
!1608 = !DILocation(line: 92, column: 45, scope: !895, inlinedAt: !1607)
!1609 = !DILocation(line: 602, column: 9, scope: !1575)
!1610 = !DILocation(line: 0, scope: !704, inlinedAt: !1611)
!1611 = distinct !DILocation(line: 602, column: 9, scope: !1575)
!1612 = !DILocation(line: 606, column: 32, scope: !1613)
!1613 = distinct !DILexicalBlock(scope: !1575, file: !2, line: 604, column: 7)
!1614 = !DILocation(line: 606, column: 36, scope: !1613)
!1615 = !DILocation(line: 606, column: 45, scope: !1613)
!1616 = !DILocation(line: 606, column: 49, scope: !1613)
!1617 = !DILocation(line: 607, column: 17, scope: !1613)
!1618 = !DILocation(line: 607, column: 25, scope: !1613)
!1619 = !DILocation(line: 608, column: 11, scope: !1613)
!1620 = !DILocation(line: 606, column: 4, scope: !1613)
!1621 = !DILocation(line: 605, column: 8, scope: !1613)
!1622 = !DILocation(line: 605, column: 16, scope: !1613)
!1623 = !DILocation(line: 605, column: 26, scope: !1613)
!1624 = !DILocation(line: 609, column: 7, scope: !1575)
!1625 = !DILocation(line: 0, scope: !704, inlinedAt: !1626)
!1626 = distinct !DILocation(line: 602, column: 9, scope: !1575)
!1627 = !DILocation(line: 609, column: 7, scope: !1613)
!1628 = distinct !DISubprogram(name: "size", linkageName: "_ZNKSt6vectorIiSaIiEE4sizeEv", scope: !14, file: !2, line: 992, type: !496, scopeLine: 993, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !495, retainedNodes: !138)
!1629 = !DILocalVariable(name: "this", arg: 1, scope: !1628, type: !1630, flags: DIFlagArtificial | DIFlagObjectPointer)
!1630 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !307, size: 64)
!1631 = !DILocation(line: 0, scope: !1628)
!1632 = !DILocation(line: 993, column: 32, scope: !1628)
!1633 = !DILocation(line: 993, column: 40, scope: !1628)
!1634 = !DILocation(line: 993, column: 58, scope: !1628)
!1635 = !DILocation(line: 993, column: 66, scope: !1628)
!1636 = !DILocation(line: 993, column: 50, scope: !1628)
!1637 = !DILocation(line: 993, column: 9, scope: !1628)
!1638 = distinct !DISubprogram(name: "__uninitialized_copy_a<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *, int>", linkageName: "_ZSt22__uninitialized_copy_aIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiiET0_T_SA_S9_RSaIT1_E", scope: !15, file: !1128, line: 366, type: !1639, scopeLine: 368, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1641, retainedNodes: !138)
!1639 = !DISubroutineType(types: !1640)
!1640 = !{!39, !420, !420, !39, !95}
!1641 = !{!1642, !858, !82}
!1642 = !DITemplateTypeParameter(name: "_InputIterator", type: !420)
!1643 = !DILocalVariable(name: "__first", arg: 1, scope: !1638, file: !1128, line: 366, type: !420)
!1644 = !DILocation(line: 366, column: 43, scope: !1638)
!1645 = !DILocalVariable(name: "__last", arg: 2, scope: !1638, file: !1128, line: 366, type: !420)
!1646 = !DILocation(line: 366, column: 67, scope: !1638)
!1647 = !DILocalVariable(name: "__result", arg: 3, scope: !1638, file: !1128, line: 367, type: !39)
!1648 = !DILocation(line: 367, column: 24, scope: !1638)
!1649 = !DILocalVariable(arg: 4, scope: !1638, file: !1128, line: 367, type: !95)
!1650 = !DILocation(line: 367, column: 49, scope: !1638)
!1651 = !DILocation(line: 373, column: 38, scope: !1638)
!1652 = !DILocation(line: 373, column: 47, scope: !1638)
!1653 = !DILocation(line: 373, column: 55, scope: !1638)
!1654 = !DILocation(line: 373, column: 14, scope: !1638)
!1655 = !DILocation(line: 373, column: 7, scope: !1638)
!1656 = distinct !DISubprogram(name: "begin", linkageName: "_ZNKSt6vectorIiSaIiEE5beginEv", scope: !14, file: !2, line: 883, type: !417, scopeLine: 884, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !416, retainedNodes: !138)
!1657 = !DILocalVariable(name: "this", arg: 1, scope: !1656, type: !1630, flags: DIFlagArtificial | DIFlagObjectPointer)
!1658 = !DILocation(line: 0, scope: !1656)
!1659 = !DILocation(line: 884, column: 37, scope: !1656)
!1660 = !DILocation(line: 884, column: 45, scope: !1656)
!1661 = !DILocation(line: 884, column: 16, scope: !1656)
!1662 = !DILocation(line: 884, column: 9, scope: !1656)
!1663 = distinct !DISubprogram(name: "end", linkageName: "_ZNKSt6vectorIiSaIiEE3endEv", scope: !14, file: !2, line: 903, type: !417, scopeLine: 904, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !478, retainedNodes: !138)
!1664 = !DILocalVariable(name: "this", arg: 1, scope: !1663, type: !1630, flags: DIFlagArtificial | DIFlagObjectPointer)
!1665 = !DILocation(line: 0, scope: !1663)
!1666 = !DILocation(line: 904, column: 37, scope: !1663)
!1667 = !DILocation(line: 904, column: 45, scope: !1663)
!1668 = !DILocation(line: 904, column: 16, scope: !1663)
!1669 = !DILocation(line: 904, column: 9, scope: !1663)
!1670 = distinct !DISubprogram(name: "uninitialized_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt18uninitialized_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_", scope: !15, file: !1128, line: 163, type: !1671, scopeLine: 165, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1673, retainedNodes: !138)
!1671 = !DISubroutineType(types: !1672)
!1672 = !{!39, !420, !420, !39}
!1673 = !{!1642, !858}
!1674 = !DILocalVariable(name: "__first", arg: 1, scope: !1670, file: !1128, line: 163, type: !420)
!1675 = !DILocation(line: 163, column: 39, scope: !1670)
!1676 = !DILocalVariable(name: "__last", arg: 2, scope: !1670, file: !1128, line: 163, type: !420)
!1677 = !DILocation(line: 163, column: 63, scope: !1670)
!1678 = !DILocalVariable(name: "__result", arg: 3, scope: !1670, file: !1128, line: 164, type: !39)
!1679 = !DILocation(line: 164, column: 27, scope: !1670)
!1680 = !DILocalVariable(name: "__can_memmove", scope: !1670, file: !1128, line: 174, type: !243)
!1681 = !DILocation(line: 174, column: 18, scope: !1670)
!1682 = !DILocalVariable(name: "__assignable", scope: !1670, file: !1128, line: 181, type: !243)
!1683 = !DILocation(line: 181, column: 18, scope: !1670)
!1684 = !DILocation(line: 185, column: 16, scope: !1670)
!1685 = !DILocation(line: 185, column: 25, scope: !1670)
!1686 = !DILocation(line: 185, column: 33, scope: !1670)
!1687 = !DILocation(line: 184, column: 14, scope: !1670)
!1688 = !DILocation(line: 184, column: 7, scope: !1670)
!1689 = distinct !DISubprogram(name: "__uninit_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_", scope: !1690, file: !1128, line: 145, type: !1671, scopeLine: 147, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1673, declaration: !1693, retainedNodes: !138)
!1690 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__uninitialized_copy<true>", scope: !15, file: !1128, line: 141, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1691, identifier: "_ZTSSt20__uninitialized_copyILb1EE")
!1691 = !{!1692}
!1692 = !DITemplateValueParameter(name: "_TrivialValueTypes", type: !131, value: i1 true)
!1693 = !DISubprogram(name: "__uninit_copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZNSt20__uninitialized_copyILb1EE13__uninit_copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiEET0_T_SC_SB_", scope: !1690, file: !1128, line: 145, type: !1671, scopeLine: 145, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0, templateParams: !1673)
!1694 = !DILocalVariable(name: "__first", arg: 1, scope: !1689, file: !1128, line: 145, type: !420)
!1695 = !DILocation(line: 145, column: 38, scope: !1689)
!1696 = !DILocalVariable(name: "__last", arg: 2, scope: !1689, file: !1128, line: 145, type: !420)
!1697 = !DILocation(line: 145, column: 62, scope: !1689)
!1698 = !DILocalVariable(name: "__result", arg: 3, scope: !1689, file: !1128, line: 146, type: !39)
!1699 = !DILocation(line: 146, column: 26, scope: !1689)
!1700 = !DILocation(line: 147, column: 28, scope: !1689)
!1701 = !DILocation(line: 147, column: 37, scope: !1689)
!1702 = !DILocation(line: 147, column: 45, scope: !1689)
!1703 = !DILocation(line: 147, column: 18, scope: !1689)
!1704 = !DILocation(line: 147, column: 11, scope: !1689)
!1705 = distinct !DISubprogram(name: "copy<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt4copyIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET0_T_SA_S9_", scope: !15, file: !1009, line: 624, type: !1671, scopeLine: 625, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1706, retainedNodes: !138)
!1706 = !{!1707, !1212}
!1707 = !DITemplateTypeParameter(name: "_II", type: !420)
!1708 = !DILocalVariable(name: "__first", arg: 1, scope: !1705, file: !1009, line: 624, type: !420)
!1709 = !DILocation(line: 624, column: 14, scope: !1705)
!1710 = !DILocalVariable(name: "__last", arg: 2, scope: !1705, file: !1009, line: 624, type: !420)
!1711 = !DILocation(line: 624, column: 27, scope: !1705)
!1712 = !DILocalVariable(name: "__result", arg: 3, scope: !1705, file: !1009, line: 624, type: !39)
!1713 = !DILocation(line: 624, column: 39, scope: !1705)
!1714 = !DILocation(line: 633, column: 26, scope: !1705)
!1715 = !DILocation(line: 633, column: 8, scope: !1705)
!1716 = !DILocation(line: 633, column: 54, scope: !1705)
!1717 = !DILocation(line: 633, column: 36, scope: !1705)
!1718 = !DILocation(line: 633, column: 63, scope: !1705)
!1719 = !DILocation(line: 632, column: 14, scope: !1705)
!1720 = !DILocation(line: 632, column: 7, scope: !1705)
!1721 = distinct !DISubprogram(name: "__copy_move_a<false, __gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > >, int *>", linkageName: "_ZSt13__copy_move_aILb0EN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEPiET1_T0_SA_S9_", scope: !15, file: !1009, line: 538, type: !1671, scopeLine: 539, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1722, retainedNodes: !138)
!1722 = !{!1723, !1707, !1212}
!1723 = !DITemplateValueParameter(name: "_IsMove", type: !131, value: i1 false)
!1724 = !DILocalVariable(name: "__first", arg: 1, scope: !1721, file: !1009, line: 538, type: !420)
!1725 = !DILocation(line: 538, column: 23, scope: !1721)
!1726 = !DILocalVariable(name: "__last", arg: 2, scope: !1721, file: !1009, line: 538, type: !420)
!1727 = !DILocation(line: 538, column: 36, scope: !1721)
!1728 = !DILocalVariable(name: "__result", arg: 3, scope: !1721, file: !1009, line: 538, type: !39)
!1729 = !DILocation(line: 538, column: 48, scope: !1721)
!1730 = !DILocation(line: 541, column: 50, scope: !1721)
!1731 = !DILocation(line: 541, column: 32, scope: !1721)
!1732 = !DILocation(line: 542, column: 29, scope: !1721)
!1733 = !DILocation(line: 542, column: 11, scope: !1721)
!1734 = !DILocation(line: 543, column: 29, scope: !1721)
!1735 = !DILocation(line: 543, column: 11, scope: !1721)
!1736 = !DILocation(line: 541, column: 3, scope: !1721)
!1737 = !DILocation(line: 540, column: 14, scope: !1721)
!1738 = !DILocation(line: 540, column: 7, scope: !1721)
!1739 = distinct !DISubprogram(name: "__miter_base<__gnu_cxx::__normal_iterator<const int *, std::vector<int, std::allocator<int> > > >", linkageName: "_ZSt12__miter_baseIN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEEET_S8_", scope: !15, file: !1740, line: 607, type: !1741, scopeLine: 608, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1743, retainedNodes: !138)
!1740 = !DIFile(filename: "/usr/lib/gcc/x86_64-linux-gnu/13/../../../../include/c++/13/bits/cpp_type_traits.h", directory: "")
!1741 = !DISubroutineType(types: !1742)
!1742 = !{!420, !420}
!1743 = !{!1744}
!1744 = !DITemplateTypeParameter(name: "_Iterator", type: !420)
!1745 = !DILocalVariable(name: "__it", arg: 1, scope: !1739, file: !1740, line: 607, type: !420)
!1746 = !DILocation(line: 607, column: 28, scope: !1739)
!1747 = !DILocation(line: 608, column: 14, scope: !1739)
!1748 = !DILocation(line: 608, column: 7, scope: !1739)
!1749 = distinct !DISubprogram(name: "__niter_wrap<int *>", linkageName: "_ZSt12__niter_wrapIPiET_RKS1_S1_", scope: !15, file: !1009, line: 338, type: !1750, scopeLine: 339, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !377, retainedNodes: !138)
!1750 = !DISubroutineType(types: !1751)
!1751 = !{!39, !368, !39}
!1752 = !DILocalVariable(arg: 1, scope: !1749, file: !1009, line: 338, type: !368)
!1753 = !DILocation(line: 338, column: 34, scope: !1749)
!1754 = !DILocalVariable(name: "__res", arg: 2, scope: !1749, file: !1009, line: 338, type: !39)
!1755 = !DILocation(line: 338, column: 46, scope: !1749)
!1756 = !DILocation(line: 339, column: 14, scope: !1749)
!1757 = !DILocation(line: 339, column: 7, scope: !1749)
!1758 = distinct !DISubprogram(name: "__copy_move_a1<false, const int *, int *>", linkageName: "_ZSt14__copy_move_a1ILb0EPKiPiET1_T0_S4_S3_", scope: !15, file: !1009, line: 532, type: !1759, scopeLine: 533, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1761, retainedNodes: !138)
!1759 = !DISubroutineType(types: !1760)
!1760 = !{!39, !423, !423, !39}
!1761 = !{!1723, !1762, !1212}
!1762 = !DITemplateTypeParameter(name: "_II", type: !423)
!1763 = !DILocalVariable(name: "__first", arg: 1, scope: !1758, file: !1009, line: 532, type: !423)
!1764 = !DILocation(line: 532, column: 24, scope: !1758)
!1765 = !DILocalVariable(name: "__last", arg: 2, scope: !1758, file: !1009, line: 532, type: !423)
!1766 = !DILocation(line: 532, column: 37, scope: !1758)
!1767 = !DILocalVariable(name: "__result", arg: 3, scope: !1758, file: !1009, line: 532, type: !39)
!1768 = !DILocation(line: 532, column: 49, scope: !1758)
!1769 = !DILocation(line: 533, column: 43, scope: !1758)
!1770 = !DILocation(line: 533, column: 52, scope: !1758)
!1771 = !DILocation(line: 533, column: 60, scope: !1758)
!1772 = !DILocation(line: 533, column: 14, scope: !1758)
!1773 = !DILocation(line: 533, column: 7, scope: !1758)
!1774 = distinct !DISubprogram(name: "__niter_base<const int *, std::vector<int, std::allocator<int> > >", linkageName: "_ZSt12__niter_baseIPKiSt6vectorIiSaIiEEET_N9__gnu_cxx17__normal_iteratorIS5_T0_EE", scope: !15, file: !358, line: 1357, type: !1775, scopeLine: 1359, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !475, retainedNodes: !138)
!1775 = !DISubroutineType(types: !1776)
!1776 = !{!423, !420}
!1777 = !DILocalVariable(name: "__it", arg: 1, scope: !1774, file: !358, line: 1357, type: !420)
!1778 = !DILocation(line: 1357, column: 70, scope: !1774)
!1779 = !DILocation(line: 1359, column: 19, scope: !1774)
!1780 = !DILocation(line: 1359, column: 7, scope: !1774)
!1781 = distinct !DISubprogram(name: "__niter_base<int *>", linkageName: "_ZSt12__niter_baseIPiET_S1_", scope: !15, file: !1009, line: 316, type: !1782, scopeLine: 318, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !377, retainedNodes: !138)
!1782 = !DISubroutineType(types: !1783)
!1783 = !{!39, !39}
!1784 = !DILocalVariable(name: "__it", arg: 1, scope: !1781, file: !1009, line: 316, type: !39)
!1785 = !DILocation(line: 316, column: 28, scope: !1781)
!1786 = !DILocation(line: 318, column: 14, scope: !1781)
!1787 = !DILocation(line: 318, column: 7, scope: !1781)
!1788 = distinct !DISubprogram(name: "__copy_move_a2<false, const int *, int *>", linkageName: "_ZSt14__copy_move_a2ILb0EPKiPiET1_T0_S4_S3_", scope: !15, file: !1009, line: 497, type: !1759, scopeLine: 498, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1761, retainedNodes: !138)
!1789 = !DILocalVariable(name: "__first", arg: 1, scope: !1788, file: !1009, line: 497, type: !423)
!1790 = !DILocation(line: 497, column: 24, scope: !1788)
!1791 = !DILocalVariable(name: "__last", arg: 2, scope: !1788, file: !1009, line: 497, type: !423)
!1792 = !DILocation(line: 497, column: 37, scope: !1788)
!1793 = !DILocalVariable(name: "__result", arg: 3, scope: !1788, file: !1009, line: 497, type: !39)
!1794 = !DILocation(line: 497, column: 49, scope: !1788)
!1795 = !DILocation(line: 506, column: 31, scope: !1788)
!1796 = !DILocation(line: 506, column: 40, scope: !1788)
!1797 = !DILocation(line: 506, column: 48, scope: !1788)
!1798 = !DILocation(line: 505, column: 14, scope: !1788)
!1799 = !DILocation(line: 505, column: 7, scope: !1788)
!1800 = distinct !DISubprogram(name: "__copy_m<const int, int>", linkageName: "_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_", scope: !1801, file: !1009, line: 433, type: !1759, scopeLine: 434, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1806, declaration: !1805, retainedNodes: !138)
!1801 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__copy_move<false, true, std::random_access_iterator_tag>", scope: !15, file: !1009, line: 428, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1802, identifier: "_ZTSSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE")
!1802 = !{!1723, !1803, !1804}
!1803 = !DITemplateValueParameter(name: "_IsSimple", type: !131, value: i1 true)
!1804 = !DITemplateTypeParameter(name: "_Category", type: !1229)
!1805 = !DISubprogram(name: "__copy_m<const int, int>", linkageName: "_ZNSt11__copy_moveILb0ELb1ESt26random_access_iterator_tagE8__copy_mIKiiEEPT0_PT_S7_S5_", scope: !1801, file: !1009, line: 433, type: !1759, scopeLine: 433, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0, templateParams: !1806)
!1806 = !{!1807, !1808}
!1807 = !DITemplateTypeParameter(name: "_Tp", type: !424)
!1808 = !DITemplateTypeParameter(name: "_Up", type: !40)
!1809 = !DILocalVariable(name: "__first", arg: 1, scope: !1800, file: !1009, line: 433, type: !423)
!1810 = !DILocation(line: 433, column: 16, scope: !1800)
!1811 = !DILocalVariable(name: "__last", arg: 2, scope: !1800, file: !1009, line: 433, type: !423)
!1812 = !DILocation(line: 433, column: 30, scope: !1800)
!1813 = !DILocalVariable(name: "__result", arg: 3, scope: !1800, file: !1009, line: 433, type: !39)
!1814 = !DILocation(line: 433, column: 43, scope: !1800)
!1815 = !DILocalVariable(name: "_Num", scope: !1800, file: !1009, line: 435, type: !1816)
!1816 = !DIDerivedType(tag: DW_TAG_const_type, baseType: !401)
!1817 = !DILocation(line: 435, column: 20, scope: !1800)
!1818 = !DILocation(line: 435, column: 27, scope: !1800)
!1819 = !DILocation(line: 435, column: 36, scope: !1800)
!1820 = !DILocation(line: 435, column: 34, scope: !1800)
!1821 = !DILocation(line: 436, column: 25, scope: !1822)
!1822 = distinct !DILexicalBlock(scope: !1800, file: !1009, line: 436, column: 8)
!1823 = !DILocation(line: 436, column: 30, scope: !1822)
!1824 = !DILocation(line: 436, column: 8, scope: !1822)
!1825 = !DILocation(line: 437, column: 24, scope: !1822)
!1826 = !DILocation(line: 437, column: 34, scope: !1822)
!1827 = !DILocation(line: 437, column: 57, scope: !1822)
!1828 = !DILocation(line: 437, column: 55, scope: !1822)
!1829 = !DILocation(line: 437, column: 6, scope: !1822)
!1830 = !DILocation(line: 438, column: 13, scope: !1831)
!1831 = distinct !DILexicalBlock(scope: !1822, file: !1009, line: 438, column: 13)
!1832 = !DILocation(line: 438, column: 18, scope: !1831)
!1833 = !DILocation(line: 440, column: 21, scope: !1831)
!1834 = !DILocation(line: 440, column: 31, scope: !1831)
!1835 = !DILocation(line: 439, column: 6, scope: !1831)
!1836 = !DILocation(line: 441, column: 11, scope: !1800)
!1837 = !DILocation(line: 441, column: 22, scope: !1800)
!1838 = !DILocation(line: 441, column: 20, scope: !1800)
!1839 = !DILocation(line: 441, column: 4, scope: !1800)
!1840 = distinct !DISubprogram(name: "__assign_one<int, const int>", linkageName: "_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_", scope: !1841, file: !1009, line: 397, type: !1844, scopeLine: 398, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1847, declaration: !1846, retainedNodes: !138)
!1841 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "__copy_move<false, false, std::random_access_iterator_tag>", scope: !15, file: !1009, line: 378, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1842, identifier: "_ZTSSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE")
!1842 = !{!1723, !1843, !1804}
!1843 = !DITemplateValueParameter(name: "_IsSimple", type: !131, value: i1 false)
!1844 = !DISubroutineType(types: !1845)
!1845 = !{null, !39, !423}
!1846 = !DISubprogram(name: "__assign_one<int, const int>", linkageName: "_ZNSt11__copy_moveILb0ELb0ESt26random_access_iterator_tagE12__assign_oneIiKiEEvPT_PT0_", scope: !1841, file: !1009, line: 397, type: !1844, scopeLine: 397, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0, templateParams: !1847)
!1847 = !{!82, !1848}
!1848 = !DITemplateTypeParameter(name: "_Up", type: !424)
!1849 = !DILocalVariable(name: "__to", arg: 1, scope: !1840, file: !1009, line: 397, type: !39)
!1850 = !DILocation(line: 397, column: 20, scope: !1840)
!1851 = !DILocalVariable(name: "__from", arg: 2, scope: !1840, file: !1009, line: 397, type: !423)
!1852 = !DILocation(line: 397, column: 31, scope: !1840)
!1853 = !DILocation(line: 398, column: 13, scope: !1840)
!1854 = !DILocation(line: 398, column: 12, scope: !1840)
!1855 = !DILocation(line: 398, column: 5, scope: !1840)
!1856 = !DILocation(line: 398, column: 10, scope: !1840)
!1857 = !DILocation(line: 398, column: 21, scope: !1840)
!1858 = distinct !DISubprogram(name: "base", linkageName: "_ZNK9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEE4baseEv", scope: !420, file: !358, line: 1162, type: !473, scopeLine: 1163, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !472, retainedNodes: !138)
!1859 = !DILocalVariable(name: "this", arg: 1, scope: !1858, type: !1860, flags: DIFlagArtificial | DIFlagObjectPointer)
!1860 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !444, size: 64)
!1861 = !DILocation(line: 0, scope: !1858)
!1862 = !DILocation(line: 1163, column: 16, scope: !1858)
!1863 = !DILocation(line: 1163, column: 9, scope: !1858)
!1864 = distinct !DISubprogram(name: "__normal_iterator", linkageName: "_ZN9__gnu_cxx17__normal_iteratorIPKiSt6vectorIiSaIiEEEC2ERKS2_", scope: !420, file: !358, line: 1076, type: !430, scopeLine: 1077, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, declaration: !429, retainedNodes: !138)
!1865 = !DILocalVariable(name: "this", arg: 1, scope: !1864, type: !1866, flags: DIFlagArtificial | DIFlagObjectPointer)
!1866 = !DIDerivedType(tag: DW_TAG_pointer_type, baseType: !420, size: 64)
!1867 = !DILocation(line: 0, scope: !1864)
!1868 = !DILocalVariable(name: "__i", arg: 2, scope: !1864, file: !358, line: 1076, type: !432)
!1869 = !DILocation(line: 1076, column: 42, scope: !1864)
!1870 = !DILocation(line: 1077, column: 9, scope: !1864)
!1871 = !DILocation(line: 1077, column: 20, scope: !1864)
!1872 = !DILocation(line: 1077, column: 27, scope: !1864)
!1873 = distinct !DISubprogram(name: "_Destroy<int *>", linkageName: "_ZSt8_DestroyIPiEvT_S1_", scope: !15, file: !1198, line: 182, type: !1874, scopeLine: 183, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1876, retainedNodes: !138)
!1874 = !DISubroutineType(types: !1875)
!1875 = !{null, !39, !39}
!1876 = !{!858}
!1877 = !DILocalVariable(name: "__first", arg: 1, scope: !1873, file: !1198, line: 182, type: !39)
!1878 = !DILocation(line: 182, column: 31, scope: !1873)
!1879 = !DILocalVariable(name: "__last", arg: 2, scope: !1873, file: !1198, line: 182, type: !39)
!1880 = !DILocation(line: 182, column: 57, scope: !1873)
!1881 = !DILocation(line: 196, column: 12, scope: !1873)
!1882 = !DILocation(line: 196, column: 21, scope: !1873)
!1883 = !DILocation(line: 195, column: 7, scope: !1873)
!1884 = !DILocation(line: 197, column: 5, scope: !1873)
!1885 = distinct !DISubprogram(name: "__destroy<int *>", linkageName: "_ZNSt12_Destroy_auxILb1EE9__destroyIPiEEvT_S3_", scope: !1886, file: !1198, line: 172, type: !1874, scopeLine: 172, flags: DIFlagPrototyped, spFlags: DISPFlagDefinition, unit: !8, templateParams: !1876, declaration: !1888, retainedNodes: !138)
!1886 = distinct !DICompositeType(tag: DW_TAG_structure_type, name: "_Destroy_aux<true>", scope: !15, file: !1198, line: 168, size: 8, flags: DIFlagTypePassByValue, elements: !138, templateParams: !1887, identifier: "_ZTSSt12_Destroy_auxILb1EE")
!1887 = !{!1304}
!1888 = !DISubprogram(name: "__destroy<int *>", linkageName: "_ZNSt12_Destroy_auxILb1EE9__destroyIPiEEvT_S3_", scope: !1886, file: !1198, line: 172, type: !1874, scopeLine: 172, flags: DIFlagPrototyped | DIFlagStaticMember, spFlags: 0, templateParams: !1876)
!1889 = !DILocalVariable(arg: 1, scope: !1885, file: !1198, line: 172, type: !39)
!1890 = !DILocation(line: 172, column: 35, scope: !1885)
!1891 = !DILocalVariable(arg: 2, scope: !1885, file: !1198, line: 172, type: !39)
!1892 = !DILocation(line: 172, column: 53, scope: !1885)
!1893 = !DILocation(line: 172, column: 57, scope: !1885)
